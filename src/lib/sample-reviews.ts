// Avaliações de exemplo geradas de forma determinística por produto.
// Cada produto recebe 3 a 4 avaliações com nomes e cidades únicos,
// sorteados a partir do ID do produto — assim os mesmos nomes nunca
// se repetem entre produtos diferentes.

export interface SampleReview {
  id: string;
  author: string;
  city: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

const FIRST_NAMES = [
  "Ana Paula", "Carlos Eduardo", "Mariana", "João Pedro", "Fernanda", "Ricardo",
  "Juliana", "Marcos Vinícius", "Patrícia", "Lucas", "Camila", "Rafael",
  "Beatriz", "Thiago", "Larissa", "Gustavo", "Aline", "Felipe",
  "Renata", "Bruno", "Vanessa", "Diego", "Priscila", "André",
  "Tatiane", "Rodrigo", "Simone", "Leandro", "Cristiane", "Fábio",
  "Débora", "Marcelo", "Sabrina", "Eduardo", "Michele", "Alexandre",
  "Rosana", "Vinícius", "Elaine", "Matheus", "Carla", "Sérgio",
  "Daniele", "Wagner", "Luciana", "Igor", "Mônica", "Robson",
  "Adriana", "Caio", "Silvana", "Henrique", "Viviane", "Otávio",
  "Natália", "Fernando", "Bianca", "Rômulo", "Letícia", "Márcio",
  "Gabriela", "Everton", "Suzana", "Nilton", "Kátia", "Júlio",
];

const CITIES = [
  "Boa Vista - RR", "Manaus - AM", "São Paulo - SP", "Rio de Janeiro - RJ",
  "Belém - PA", "Fortaleza - CE", "Recife - PE", "Salvador - BA",
  "Curitiba - PR", "Porto Alegre - RS", "Goiânia - GO", "Brasília - DF",
  "Belo Horizonte - MG", "Florianópolis - SC", "Campo Grande - MS",
  "Cuiabá - MT", "Macapá - AP", "Palmas - TO", "Teresina - PI",
  "São Luís - MA", "Natal - RN", "João Pessoa - PB", "Maceió - AL",
  "Aracaju - SE", "Vitória - ES", "Campinas - SP", "Santos - SP",
  "Ribeirão Preto - SP", "Uberlândia - MG", "Londrina - PR", "Joinville - SC",
  "Niterói - RJ", "São José dos Campos - SP", "Feira de Santana - BA",
  "Juazeiro do Norte - CE", "Ananindeua - PA", "Sorocaba - SP",
];

const COMMENTS_5 = [
  "Produto excelente, chegou antes do prazo e muito bem embalado. Superou minhas expectativas, recomendo demais!",
  "Qualidade impressionante pelo preço. Já é a segunda vez que compro nesta loja e nunca me decepcionou.",
  "Chegou tudo certinho, exatamente como no anúncio. Atendimento rápido quando tirei uma dúvida. Nota dez!",
  "Muito satisfeita com a compra! O produto é de ótima qualidade e a entrega foi mais rápida do que eu imaginava.",
  "Comprei com um pouco de receio, mas me surpreendi. Produto original, bem acabado e funcionando perfeitamente.",
  "Perfeito! Já testei e aprovei. O custo-benefício é incrível, vale cada centavo.",
  "Entrega rápida e produto de primeira. Com certeza vou comprar de novo nesta loja.",
  "Melhor compra que fiz esse ano. Qualidade top e chegou super bem protegido.",
];

const COMMENTS_4 = [
  "Produto muito bom, atendeu bem o que eu precisava. Só achei que a embalagem poderia ser um pouco melhor.",
  "Gostei bastante! A qualidade é boa e o preço justo. A entrega demorou um pouquinho, mas valeu a pena.",
  "Bom produto, funciona direitinho. Tirando um pequeno atraso na entrega, foi tudo tranquilo.",
  "No geral estou satisfeito. O produto é de boa qualidade, só esperava que viesse com mais acessórios.",
  "Cumpre o que promete. A cor era um pouco diferente da foto, mas a qualidade compensou.",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Sorteio determinístico sem repetição dentro do mesmo produto.
function pickUnique<T>(pool: T[], seed: number, count: number, salt: number): T[] {
  const indices = new Set<number>();
  let cursor = seed + salt * 7919;
  while (indices.size < count && indices.size < pool.length) {
    cursor = (cursor * 1103515245 + 12345) % 2147483648;
    indices.add(cursor % pool.length);
  }
  return [...indices].map((i) => pool[i]);
}

export function getSampleReviews(productId: string): SampleReview[] {
  const seed = hashString(productId);
  const count = 3 + (seed % 2); // 3 ou 4 avaliações
  // O salt usa o hash do produto, então a combinação de nomes é única por produto.
  const names = pickUnique(FIRST_NAMES, seed, count, seed % 97);
  const cities = pickUnique(CITIES, seed, count, (seed >> 3) % 89);

  const reviews: SampleReview[] = [];
  for (let i = 0; i < count; i++) {
    const rating = i === count - 1 && seed % 3 === 0 ? 4 : seed % 5 === 0 && i === 1 ? 4 : 5;
    const commentPool = rating === 5 ? COMMENTS_5 : COMMENTS_4;
    const comment = commentPool[(seed + i * 13) % commentPool.length];
    const daysAgo = 3 + ((seed >> (i + 2)) % 55);
    const date = new Date(Date.now() - daysAgo * 86_400_000).toLocaleDateString("pt-BR");
    reviews.push({
      id: `sample-${productId}-${i}`,
      author: names[i],
      city: cities[i],
      rating,
      comment,
      date,
      verified: true,
    });
  }
  return reviews;
}
