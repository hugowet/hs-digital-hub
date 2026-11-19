function SellerApplicationForm({ userId, onCreated }: { userId: string | null; onCreated: () => void }) {
  // Responsável
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");

  // Endereço / Envio
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  // Loja & Produtos
  const [storeName, setStoreName] = useState("");
  const [niche, setNiche] = useState("Eletrônicos e Acessórios");
  const [estimatedStock, setEstimatedStock] = useState("11 a 50 produtos");
  const [storeDescription, setStoreDescription] = useState("");

  // Empresa (Opcional)
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Busca automática de Cidade e UF ao digitar o CEP
  const handleCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 8);
    setCep(raw);
    if (raw.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCity(data.localidade || "");
          setState(data.uf || "");
        } else {
          toast.error("CEP não encontrado.");
        }
      } catch {
        // Falha silenciosa no ViaCEP
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const name = storeName.trim();
    if (name.length < 2) {
      toast.error("Informe o nome da sua loja.");
      return;
    }

    if (!fullName.trim() || fullName.trim().split(" ").length < 2) {
      toast.error("Informe seu nome e sobrenome completos.");
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return;
    }

    if (cep.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }

    if (isCompany) {
      const cleanCnpj = cnpj.replace(/\D/g, "");
      if (cleanCnpj.length !== 14) {
        toast.error("Informe um CNPJ válido com 14 dígitos.");
        return;
      }
      if (!companyName.trim()) {
        toast.error("Informe o nome da empresa ou razão social.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const slug = `${name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

      const { error } = await supabase.from("stores").insert({
        owner_id: userId,
        name,
        slug,
        description: storeDescription.trim() || null,
        owner_full_name: fullName.trim(),
        document_type: isCompany ? "cnpj" : "cpf",
        document_number: isCompany ? cnpj.trim() : cpf.trim(),
        company_name: isCompany ? companyName.trim() : null,
        phone: phone.trim() || null,
        origin_postal_code: cep,
        city: city.trim() || null,
        state: state.trim() || null,
        niche,
        estimated_stock: estimatedStock,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Solicitação completa enviada! Aguardando análise da HS Digital.");
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Solicitação para Vender na HS Digital</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Preencha o relatório de cadastro da sua loja. Você pode começar como pessoa física (CPF) ou cadastrar sua
          empresa (MEI/CNPJ).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="surface-card mt-8 space-y-6 p-6 sm:p-8 rounded-2xl border border-border shadow-sm"
      >
        {/* BLOCO 1: DADOS DO RESPONSÁVEL */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
            1. Dados do Responsável
          </h2>

          <div>
            <Label htmlFor="seller-fullname">Nome e Sobrenome completo *</Label>
            <Input
              id="seller-fullname"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex.: Carlos Eduardo Silva"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="seller-cpf">CPF do titular *</Label>
              <Input
                id="seller-cpf"
                required
                maxLength={14}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="seller-phone">WhatsApp / Telefone *</Label>
              <Input
                id="seller-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 90000-0000"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: LOGÍSTICA E CEP DE ORIGEM */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
            2. Local de Envio (Estoque)
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="seller-cep">CEP de envio *</Label>
              <Input
                id="seller-cep"
                required
                maxLength={8}
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="Ex.: 76940000"
                className="mt-1"
              />
              {loadingCep && <span className="text-xs text-muted-foreground">Buscando cidade...</span>}
            </div>
            <div>
              <Label htmlFor="seller-city">Cidade</Label>
              <Input
                id="seller-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="seller-state">Estado (UF)</Label>
              <Input
                id="seller-state"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="RO"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 3: DADOS DA LOJA E ESTOQUE */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
            3. Sobre a Loja e Estoque
          </h2>

          <div>
            <Label htmlFor="store-name">Nome da Loja *</Label>
            <Input
              id="store-name"
              required
              minLength={2}
              maxLength={80}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex.: JJ Eletrônicos"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="store-niche">Nicho principal *</Label>
              <select
                id="store-niche"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              >
                <option value="Eletrônicos e Acessórios">Eletrônicos e Acessórios</option>
                <option value="Moda e Calçados">Moda e Calçados</option>
                <option value="Casa e Cozinha">Casa e Cozinha</option>
                <option value="Ferramentas e Construção">Ferramentas e Construção</option>
                <option value="Beleza e Cuidados">Beleza e Cuidados</option>
                <option value="Automotivo">Automotivo</option>
                <option value="Variedades">Variedades</option>
              </select>
            </div>
            <div>
              <Label htmlFor="store-stock">Quantidade inicial de estoque *</Label>
              <select
                id="store-stock"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={estimatedStock}
                onChange={(e) => setEstimatedStock(e.target.value)}
              >
                <option value="1 a 10 produtos">1 a 10 produtos</option>
                <option value="11 a 50 produtos">11 a 50 produtos</option>
                <option value="51 a 200 produtos">51 a 200 produtos</option>
                <option value="Mais de 200 produtos">Mais de 200 produtos</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="store-description">Descrição dos produtos que vai vender</Label>
            <Textarea
              id="store-description"
              maxLength={500}
              rows={3}
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              className="mt-1"
              placeholder="Descreva detalhes dos seus produtos, marcas que trabalha e se são novos com garantia..."
            />
          </div>
        </div>

        {/* BLOCO 4: EMPRESA / MEI (OPCIONAL) */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCompany}
              onChange={(e) => setIsCompany(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary"
            />
            <span className="text-sm font-medium">Cadastrar como Empresa (MEI / CNPJ)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Lojas com CNPJ recebem o <strong>Selo de Empresa Verificada</strong> e destaque nas recomendações para os
            compradores.
          </p>

          {isCompany && (
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="company-name">Razão Social / Nome da Empresa *</Label>
                <Input
                  id="company-name"
                  required={isCompany}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex.: JJ Comércio de Acessórios LTDA"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company-cnpj">CNPJ / MEI *</Label>
                <Input
                  id="company-cnpj"
                  required={isCompany}
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full text-base py-6" disabled={submitting}>
          {submitting ? "Enviando solicitação..." : "Enviar Solicitação de Vendedor"}
        </Button>
      </form>
    </div>
  );
}
