/**
 * Categorização inteligente de produtos importados da Amazon.
 * Lê título + descrição (+ categoria original, quando houver) e escolhe
 * a categoria da vitrine com mais palavras-chave correspondentes.
 * Se nada combinar, cria/usa a categoria informada pela Amazon ou "geral".
 */

export interface AmazonCategoryRule {
  category: string;
  keywords: string[];
}

export const AMAZON_CATEGORY_RULES: AmazonCategoryRule[] = [
  {
    category: "eletronicos-gadgets",
    keywords: [
      "fone", "bluetooth", "carregador", "cabo usb", "smartwatch", "relógio inteligente",
      "caixa de som", "speaker", "echo", "alexa", "drone", "power bank", "fone de ouvido",
      "earbuds", "headset", "webcam", "microfone", "projetor", "tablet", "kindle",
      "câmera", "camera", "gopro", "console", "videogame", "controle sem fio",
    ],
  },
  {
    category: "celulares-tv",
    keywords: [
      "celular", "smartphone", "iphone", "samsung galaxy", "tv", "televisão", "televisao",
      "smart tv", "monitor", "antena", "chromecast", "fire tv", "tv box", "suporte de tv",
    ],
  },
  {
    category: "perifericos-acessorios",
    keywords: [
      "teclado", "mouse", "notebook", "computador", "ssd", "hd externo", "pendrive",
      "pen drive", "hub usb", "impressora", "roteador", "placa de vídeo", "memória ram",
      "cadeira gamer", "mousepad", "suporte notebook",
    ],
  },
  {
    category: "casa-setup",
    keywords: [
      "panela", "cozinha", "casa", "frigideira", "liquidificador", "batedeira", "air fryer",
      "fritadeira", "cafeteira", "micro-ondas", "microondas", "geladeira", "fogão", "fogao",
      "aspirador", "vassoura", "organizador", "prateleira", "luminária", "luminaria",
      "abajur", "cama", "travesseiro", "edredom", "toalha", "cortina", "tapete",
      "guarda-roupa", "sofá", "sofa", "mesa", "cadeira de escritório", "escritório",
      "home office", "churrasqueira", "jardim", "vaso", "utensílio",
      "sanduicheira", "multiprocessador", "ar condicionado", "ar-condicionado",
      "caixa térmica", "bebedouro", "máquina de lavar", "lavadora",
    ],
  },
  {
    category: "moda",
    keywords: [
      "camiseta", "camisa", "calça", "calca", "vestido", "saia", "blusa", "jaqueta",
      "moletom", "tênis", "tenis", "sapato", "sandália", "sandalia", "chinelo", "bota",
      "bolsa", "mochila", "carteira", "cinto", "óculos", "oculos", "relógio", "relogio",
      "jóia", "joia", "colar", "pulseira", "brinco", "boné", "bone", "meia", "cueca",
      "sutiã", "biquíni", "biquini", "maiô", "bermuda", "short",
    ],
  },
  {
    category: "beleza",
    keywords: [
      "perfume", "maquiagem", "batom", "base facial", "shampoo", "condicionador", "creme",
      "hidratante", "protetor solar", "skincare", "sérum", "serum", "secador de cabelo",
      "chapinha", "barbeador", "depilador", "esmalte", "unha", "escova de dentes elétrica",
      "barba", "colônia", "colonia", "desodorante",
    ],
  },
  {
    category: "esportes",
    keywords: [
      "bicicleta", "bike", "academia", "musculação", "musculacao", "halter", "peso",
      "esteira", "yoga", "pilates", "futebol", "bola", "chuteira", "camping", "barraca",
      "pesca", "natação", "natacao", "corrida", "suplemento", "whey", "creatina",
      "luva de boxe", "skate", "patins", "tênis de mesa",
    ],
  },
  {
    category: "infantil",
    keywords: [
      "brinquedo", "boneca", "boneco", "lego", "criança", "crianca", "bebê", "bebe",
      "fralda", "carrinho de bebê", "chupeta", "mamadeira", "pelúcia", "pelucia",
      "quebra-cabeça", "jogo infantil", "escolar", "mochila escolar", "estojo",
    ],
  },
  {
    category: "autos-motos",
    keywords: [
      "carro", "moto", "automotivo", "pneu", "óleo motor", "oleo motor", "bateria automotiva",
      "som automotivo", "central multimídia", "multimidia", "capa de banco", "tapete automotivo",
      "câmera de ré", "camera de re", "suporte celular carro", "aspirador automotivo",
      "carenagem", "peças moto", "peças carro",
    ],
  },
  {
    category: "ferramentas",
    keywords: [
      "furadeira", "parafusadeira", "serra", "martelo", "chave de fenda", "alicate",
      "ferramenta", "furadeira de impacto", "lixadeira", "esmerilhadeira", "trena",
      "nível laser", "nivel laser", "caixa de ferramentas", "broca",
      "roçadeira", "vonder", "makita",
    ],
  },
  {
    category: "instrumentos-musicais",
    keywords: ["violão", "guitarra", "teclado musical", "instrumento musical", "saxofone", "ukulele"],
  },
  {
    category: "mercado",
    keywords: [
      "café", "cafe", "chá", "cha", "chocolate", "biscoito", "snack", "azeite", "tempero",
      "suplemento alimentar", "vitamina", "ração", "racao", "petisco", "alimento",
    ],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Escolhe a categoria da vitrine com base em palavras-chave do título,
 * descrição e categoria original da Amazon. Retorna o slug da categoria.
 * Se nada combinar e houver categoria original da Amazon, usa-a (criando
 * a categoria nova na vitrine); senão, "geral".
 */
export function categorizeAmazonProduct(input: {
  title: string;
  description?: string;
  amazonCategory?: string;
}): string {
  const haystack = normalize(
    `${input.title} ${input.description ?? ""} ${input.amazonCategory ?? ""}`,
  );

  let best: { category: string; score: number } | null = null;
  for (const rule of AMAZON_CATEGORY_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (haystack.includes(normalize(keyword))) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { category: rule.category, score };
    }
  }
  if (best) return best.category;

  // Categoria não mapeada: cria automaticamente a partir do nó original da Amazon
  const original = (input.amazonCategory ?? "").trim();
  if (original) {
    return normalize(original)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "geral";
  }
  return "geral";
}
