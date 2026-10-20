import React, { useState } from 'react';

// Trava de segurança estrita para o seu e-mail de administrador
const ADMIN_EMAIL = "hugoet373@gmail.com";

interface ProdutoAmazon {
  id: string;
  title: string;
  price: number;
  original_cost: number;
  image_urls: string[]; // Agora aceita uma lista de fotos
  description: string;   // Campo para as especificações completas
  link_afiliado: string;
  shipping_badge: boolean;
  source_platform: string;
  status: string;
}

export default function AmazonAffiliateImporter({ userEmail, onSalvarProduto }: { userEmail: string; onSalvarProduto: (p: ProdutoAmazon) => void }) {
  const [titulo, setTitulo] = useState('');
  const [linkStripe, setLinkStripe] = useState('');
  const [precoCusto, setPrecoCusto] = useState<number | ''>('');
  const [descricao, setDescricao] = useState('');
  const [imagens, setImagens] = useState<string[]>(['']); // Começa com um campo de foto

  if (userEmail !== ADMIN_EMAIL) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500 rounded-lg text-red-200 font-bold text-center">
        Acesso restrito à administração da HS Digital.
      </div>
    );
  }

  // Função para adicionar novo campo de URL de imagem
  const adicionarCampoFoto = () => {
    setImagens([...imagens, '']);
  };

  // Função para atualizar uma URL específica da lista
  const handleAlterarFoto = (index: number, valor: string) => {
    const novasImagens = [...imagens];
    novasImagens[index] = valor;
    setImagens(novasImagens);
  };

  const handlePublicar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!precoCusto || !linkStripe || !titulo) return;

    // Filtra apenas as URLs de imagens que foram preenchidas
    const imagensFiltradas = imagens.filter(url => url.trim() !== '');

    // REGRA DE MARGEM AUTOMÁTICA DE 35%
    const margemLucro = 1.35;
    const precoVendaFinal = Number(precoCusto) * margemLucro;

    const produtoFormatado: ProdutoAmazon = {
      id: `amazon-${Date.now()}`,
      title: titulo,
      price: precoVendaFinal,
      original_cost: Number(precoCusto),
      image_urls: imagensFiltradas.length > 0 ? imagensFiltradas : ["https://ssl-images-amazon.com"],
      description: descricao, // Especificações exatamente como na Amazon
      link_afiliado: linkStripe,
      shipping_badge: true, // Frete Grátis na vitrine
      source_platform: "Amazon",
      status: "active"
    };

    onSalvarProduto(produtoFormatado);
    alert(`Produto cadastrado!\nCusto: R$ ${precoCusto}\nVitrine: R$ ${precoVendaFinal.toFixed(2)}`);

    // Limpa o formulário
    setTitulo('');
    setLinkStripe('');
    setPrecoCusto('');
    setDescricao('');
    setImagens(['']);
  };

  return (
    <div className="max-w-4xl p-6 bg-slate-900 border border-blue-600 rounded-lg text-white mx-auto my-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
          <span>🛒</span> Importador Completo Amazon
        </h2>
        
        <form onSubmit={handlePublicar} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Produto:</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Link do Site Stripe:</label>
            <input type="url" value={linkStripe} onChange={(e) => setLinkStripe(e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Preço de Custo (R\$):</label>
            <input type="number" step="0.01" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Descrição / Detalhes Técnicos da Amazon:</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white outline-none resize-none" placeholder="Cole aqui os tópicos 'Sobre este item' da Amazon..." />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">URLs das Imagens do Produto:</label>
            {imagens.map((url, index) => (
              <input key={index} type="text" value={url} onChange={(e) => handleAlterarFoto(index, e.target.value)} className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white outline-none mb-2" placeholder={`Link da Foto ${index + 1}`} />
            ))}
            <button type="button" onClick={adicionarCampoFoto} className="text-xs bg-slate-700 hover:bg-slate-600 text-blue-400 font-bold py-1 px-3 rounded transition-colors mt-1">
              + Adicionar outra foto
            </button>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors">
            Publicar com 35% de Margem
          </button>
        </form>
      </div>

      {/* Painel lateral de prévia em tempo real */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Resumo da Estrutura</h3>
          {imagens[0] && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {imagens.filter(u => u !== '').map((url, i) => (
                <img key={i} src={url} alt="Prévia" className="w-full h-20 object-contain bg-white rounded border border-slate-700" />
              ))}
            </div>
          )}
          <div className="space-y-2 text-sm border-t border-slate-800 pt-4">
            <div className="flex justify-between"><span className="text-slate-400">Custo original:</span><span>R\$ {Number(precoCusto || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-green-400"><span>Margem Bruta (35%):</span><span>+ R\$ {Number((precoCusto || 0) * 0.35).toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold border-t border-slate-800 pt-2 text-blue-400"><span>Preço na Loja:</span><span>R\$ {Number((precoCusto || 0) * 1.35).toFixed(2)}</span></div>
          </div>
        </div>
        <div className="text-xs text-slate-500 border-t border-slate-800 pt-4 mt-4">
          <p>✓ Selo Frete Grátis incluso</p>
          <p>✓ Tag de afiliado anexada: <span className="text-slate-400">hsdigitalst0c-20</span></p>
        </div>
      </div>
    </div>
  );
}
