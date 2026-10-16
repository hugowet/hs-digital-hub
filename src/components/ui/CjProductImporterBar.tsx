import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { importCjProductByUrl } from "@/lib/suppliers.functions";

type CjProductImporterBarProps = {
  storeId: string;
};

/**
 * Importa um produto individual da CJ Dropshipping pelo link ou PID.
 * Deixe a margem em branco para usar a margem padrão configurada na loja.
 */
export function CjProductImporterBar({ storeId }: CjProductImporterBarProps) {
  const queryClient = useQueryClient();
  const importProduct = useServerFn(importCjProductByUrl);
  const [productUrlOrId, setProductUrlOrId] = useState("");
  const [customMargin, setCustomMargin] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const productInput = productUrlOrId.trim();
    if (!productInput) {
      toast.error("Cole o link ou PID do produto da CJ Dropshipping.");
      return;
    }

    const marginValue = customMargin.trim() ? Number(customMargin) : undefined;
    if (marginValue !== undefined && (!Number.isFinite(marginValue) || marginValue < 0 || marginValue > 500)) {
      toast.error("Informe uma margem entre 0% e 500%, ou deixe o campo vazio para usar a margem da loja.");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importProduct({
        data: {
          storeId,
          productUrlOrId: productInput,
          customMarginPercent: marginValue,
        },
      });

      toast.success(
        result.updated
          ? `Produto “${result.title}” atualizado. Novo preço: ${brl(Number(result.price))}.`
          : `Produto “${result.title}” importado por ${brl(Number(result.price))}.`,
      );
      setProductUrlOrId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["store-products"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao importar o produto da CJ.";
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Importar produto por link da CJ Dropshipping</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Cole o link ou PID do produto. Se deixar a margem vazia, será usada a margem configurada para a loja.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={productUrlOrId}
          onChange={(event) => setProductUrlOrId(event.target.value)}
          placeholder="Cole aqui o link do produto da CJ ou o PID"
          aria-label="Link ou PID do produto da CJ Dropshipping"
          autoComplete="url"
          disabled={isImporting}
          required
          className="min-w-0 flex-1 text-sm"
        />
        <Input
          type="number"
          value={customMargin}
          onChange={(event) => setCustomMargin(event.target.value)}
          placeholder="Margem % (opcional)"
          aria-label="Margem personalizada em porcentagem (opcional)"
          min="0"
          max="500"
          step="0.1"
          disabled={isImporting}
          className="sm:w-40"
        />
        <Button type="submit" disabled={isImporting || !productUrlOrId.trim()} className="whitespace-nowrap">
          {isImporting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Importando...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Importar produto
            </>
          )}
        </Button>
      </form>
    </section>
  );
}
