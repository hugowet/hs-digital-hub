import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importCjProductByUrl } from "@/lib/suppliers.functions";

export function CjProductImporterBar({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const importProduct = useServerFn(importCjProductByUrl);
  const [url, setUrl] = useState("");
  const [margin, setMargin] = useState<number | "">(""); // Deixe vazio para usar a margem padrão da loja
  const [isLoading, setIsLoading] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Cole o link de um produto da CJ Dropshipping.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await importProduct({
        data: {
          storeId,
          productUrlOrId: url.trim(),
          customMarginPercent: margin !== "" ? Number(margin) : undefined,
        },
      });

      toast.success(
        res.updated
          ? `Produto "${res.title}" atualizado com sucesso!`
          : `Produto "${res.title}" importado com sucesso por R$ ${res.price.toFixed(2)}!`
      );
      setUrl("");
      qc.invalidateQueries({ queryKey: ["store-products", storeId] });
    } catch (err: any) {
      toast.error(err.message || "Falha ao importar produto da CJ.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">Importar Produto por Link (CJ Dropshipping)</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Copie o link de qualquer produto na CJ Dropshipping e cole abaixo. Fotos, descrição, categoria e preço com sua margem calculada serão gerados automaticamente.
      </p>

      <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole o link da CJ (ex: https://cjdropshipping.com/product/...)"
            className="pl-9"
            disabled={isLoading}
          />
        </div>

        <div className="w-full sm:w-36">
          <Input
            type="number"
            value={margin}
            onChange={(e) => setMargin(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Margem % (opcional)"
            min={1}
            max={500}
            disabled={isLoading}
          />
        </div>

        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            "Importar Produto"
          )}
        </Button>
      </form>
    </div>
  );
}
