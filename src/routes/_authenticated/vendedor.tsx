function ProductForm({ storeId, onCreated }: { storeId: string; onCreated: () => void }) {
  const createProduct = useServerFn(createSellerProduct);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);
  const [productType, setProductType] = useState<"physical" | "digital">("physical");
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [weightKg, setWeightKg] = useState("0.3");
  const [heightCm, setHeightCm] = useState("5");
  const [widthCm, setWidthCm] = useState("15");
  const [lengthCm, setLengthCm] = useState("20");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\s/g, "").replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const parsedPrice = parseNumber(price);
      if (parsedPrice <= 0) {
        toast.error("Informe um preço válido maior que zero.");
        setSubmitting(false);
        return;
      }

      const parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        toast.error("Informe uma quantidade de estoque válida.");
        setSubmitting(false);
        return;
      }

      if (productType === "digital") {
        if (!deliveryUrl.trim().startsWith("https://")) {
          toast.error("O link de entrega digital deve começar com https://");
          setSubmitting(false);
          return;
        }
      }

      let parsedWeight: number | null = null;
      let parsedHeight: number | null = null;
      let parsedWidth: number | null = null;
      let parsedLength: number | null = null;

      if (productType === "physical") {
        parsedWeight = parseNumber(weightKg);
        parsedHeight = parseNumber(heightCm);
        parsedWidth = parseNumber(widthCm);
        parsedLength = parseNumber(lengthCm);

        if (parsedWeight <= 0 || parsedHeight <= 0 || parsedWidth <= 0 || parsedLength <= 0) {
          toast.error("Preencha peso e dimensões válidos (maiores que zero) para calcular o frete.");
          setSubmitting(false);
          return;
        }
      }

      const uploaded: Array<{
        storagePath: string;
        mediaType: "image" | "video";
        mimeType: string;
        sizeBytes: number;
        position: number;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        let mime = file.type || "image/jpeg";
        if (mime === "image/jpg") mime = "image/jpeg";

        const ext = file.name.split(".").pop() || "jpg";
        const path = `${storeId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: mime });

        if (uploadErr) throw uploadErr;

        uploaded.push({
          storagePath: path,
          mediaType: mime.startsWith("video/") ? "video" : "image",
          mimeType: mime,
          sizeBytes: file.size,
          position: i,
        });
      }

      await createProduct({
        data: {
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          stock: parsedStock,
          category: category as any,
          productType,
          deliveryUrl: deliveryUrl.trim(),
          media: uploaded,
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          widthCm: parsedWidth,
          lengthCm: parsedLength,
        },
      });

      toast.success("Produto cadastrado com sucesso!");
      setTitle("");
      setDescription("");
      setPrice("");
      setStock("1");
      setFiles([]);
      if (productType === "physical") {
        setWeightKg("0.3");
        setHeightCm("5");
        setWidthCm("15");
        setLengthCm("20");
      }
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar produto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
      <h2 className="text-base font-semibold">Novo Produto</h2>
      <div>
        <Label htmlFor="p-title">Nome do Produto *</Label>
        <Input
          id="p-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ex: Teclado Mecânico RGB"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-price">Preço (R$) *</Label>
          <Input
            id="p-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0,00"
          />
        </div>
        <div>
          <Label htmlFor="p-stock">Estoque *</Label>
          <Input
            id="p-stock"
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="p-cat">Categoria *</Label>
        <select
          id="p-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-10 px-3 border rounded-md bg-background text-sm mt-1"
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="p-desc">Descrição</Label>
        <Textarea
          id="p-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Detalhes completos do produto"
        />
      </div>
      <div>
        <Label htmlFor="p-type">Tipo de Produto *</Label>
        <select
          id="p-type"
          value={productType}
          onChange={(e) => setProductType(e.target.value as "physical" | "digital")}
          className="w-full h-10 px-3 border rounded-md bg-background text-sm mt-1"
        >
          <option value="physical">Físico (Correios / Transportadora)</option>
          <option value="digital">Digital (Download / Link direto)</option>
        </select>
      </div>
      {productType === "digital" && (
        <div>
          <Label htmlFor="p-url">Link de Entrega / Download *</Label>
          <Input
            id="p-url"
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder="https://..."
            required
          />
        </div>
      )}
      {productType === "physical" && (
        <div>
          <Label>Peso e dimensões da embalagem para frete *</Label>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <span className="text-xs text-muted-foreground">Peso (kg)</span>
              <Input
                aria-label="Peso em kg"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Ex: 0.5"
                required
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Altura (cm)</span>
              <Input
                aria-label="Altura em cm"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Ex: 10"
                required
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Largura (cm)</span>
              <Input
                aria-label="Largura em cm"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                placeholder="Ex: 15"
                required
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Comprimento (cm)</span>
              <Input
                aria-label="Comprimento em cm"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                placeholder="Ex: 20"
                required
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Valores usados pelo Melhor Envio para cotar fretes reais.
          </p>
        </div>
      )}
      <div>
        <Label htmlFor="p-files">Fotos do Produto (até 10)</Label>
        <Input
          id="p-files"
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Cadastrando produto..." : "Publicar Produto"}
      </Button>
    </form>
  );
}
