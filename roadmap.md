# HS Digital — MVP

## Diagnóstico da busca Amazon — 29/10
- [x] Registrar falhas por palavra/página com código HTTP, resposta inválida, lista vazia e rejeições; preservar filtros e manter últimas 12 rodadas.
- [x] 15 testes passaram, incluindo falhas parciais/totais e rejeições, sem chamadas externas nem alteração do catálogo.
- [ ] Confirmar diagnóstico da próxima rodada real: depende da publicação; registros antigos não permitem recuperar causas omitidas.

## Segurança administrativa de frete — 28/10
- [x] Proteger alterações individuais e em massa com sessão validada e papel admin no servidor; bloquear update com HTTP 403 para não administradores.
- [x] 16 testes passaram: sessão ausente/revogada/divergente, papel negado/nulo/erro, ordem de checagens e update autorizado nas duas ações. API real aceitou sessão admin em ID inexistente sem alterar catálogo; recusa não-admin testada com contexto simulado. Build OK.

## Lucro e preços dos fornecedores — 28/10
- [x] Correção de Hugo: margem no card de produto só para hugohug12ou@gmail.com, verificada no servidor e limitada às próprias lojas; retirada de Pedidos e envios. Quatro testes passaram.
- [ ] Digital: bloqueada por falta de suporte de passkeys no acesso hospedado; navegador não garante digital exclusiva (pode usar PIN/rosto). Entrada existente preservada.
- [ ] Acompanhar aumentos e reduções de custos confirmados Amazon/CJ mantendo a regra de margem vigente e pedidos fechados intactos.
- [ ] Testar cálculos, atualização de preços e visibilidade na conta solicitada.
- [x] Margens: quatro testes; preços Amazon: três testes; precificação/CJ: doze testes passaram. Conferência automática Amazon agora atualiza custo/preço, CJ conserva fila existente.
- [ ] Verificação visual da margem: prévia exibiu 32 cards, mas sessão não carregou e nenhum valor privado apareceu; não confirmado na conta real.

## Avisos e reprodução — 28/10
- [x] Robô Amazon ativo a cada 10 minutos; última execução 22:50 UTC, última criação 10h UTC. Registrar resultados/repetidos/falhas nas próximas rodadas sem afrouxar filtros.
- [ ] Confirmar causa exata da falta de novos produtos Amazon: histórico anterior não guardou resultados; depende da próxima rodada com diagnóstico atualizado.
- [x] Tamanhos CJ só ativos/com estoque e confirmação antes de navegar; opções Amazon não confirmadas ocultas, estoque genérico 999 removido das novas conferências; testes passaram.
- [x] Novas importações CJ filtradas por categorias relevantes e equilibradas, inclusive fila antiga; estoque/preços/pausa Amazon preservados. Produtos antigos não excluídos; próxima execução ainda não observada.
- [x] Pontinho vermelho no chat do comprador, compras, menu e aba/conversas do vendedor; leitura só com conversa visível.
- [x] Interromper áudio anterior ao ouvir outro ou iniciar gravação; pausa ao sair e esconder Social.
- [x] Trends com guarda de visibilidade/interseção, limpeza ao sair e bloqueio de solicitações atrasadas; mídia inativa sem carregamento automático.
- [x] 32 testes Vitest, 9 testes Social/CJ e 4 de opções Amazon passaram; prévia compilou sem erros.
- [x] Reprodução com mídia real em tela isolada: vídeo visível toca; oculto/inativo pausa; segundo áudio interrompe primeiro e gravação pausa todos. Tela real ainda não homologada.
- [ ] Homologar conversa nas duas pontas, tamanhos e mídia nas telas reais: navegador não carregou sessão/HS Social e Trends apresentou apenas anúncio, sem vídeos para exercitar.

## Chat, filtros e voltar — 28/10
- [x] Recolher as mensagens do pedido em uma janela “Fale com o vendedor”, preservando envio e respostas no Seller Center.
- [x] Posicionar filtros compactos abaixo das categorias, com internacional roxo e nacional verde permanentes; acrescentar “Mais vendidos” à ordenação existente. Posição e cores conferidas no celular; catálogo paginado preservado e lista memorizada.
- [x] Separar o histórico do menu da confirmação de saída, mantendo página e posição; três testes de voltar passaram.
- [ ] Validar cliques do menu/filtros e conversa num pedido real: a prévia exibe a página mas não ativa os cliques; sessão não foi carregada pelo navegador. Aparência dos filtros conferida, interação ainda não homologada.

## Rastreio e fotos em Minhas compras — 28/10
- [x] Corrigir conflito de salvamento por pedido, loja e fornecedor; função aplicada e definição conferida.
- [x] Implementar fotos e etapas reais em Minhas compras e no detalhe, com eventos ao vivo e recuperação a cada 15 segundos.
- [x] Testar regras: 17 testes passaram e prévia compilou sem erros.
- [x] Registrar previsão real do fornecedor no Seller Center da conta solicitada e mostrar dia/data estimada com dois dias corridos de segurança.
- [ ] Conferir vendedor → comprador e aparência: navegador autenticado permaneceu em branco sem erro exposto; não homologado com pedido real.
- [ ] Rastreio automático Amazon: depende de integração autorizada; código isolado não consulta eventos, vendedor ainda registra etapas e previsão.

## Chamadas HS Social — 28/10
- [x] Corrigir negociação de áudio/vídeo, SDP antes de ICE, estado síncrono, envio sem inscrição no canal destinatário, encerramento e recuperação de reprodução; três testes passaram. Mensagens de áudio preservadas.
- [ ] Validar chamadas nas duas pontas: prévia permanece em branco e módulos React não carregam mesmo após recuperação do cache; chamadas entre celulares/redes diferentes não homologadas e dependem do relay externo.

## Relatório e rastreio do vendedor — 28/10
- [x] Relatório visível e copiável exclusivo de hugohug12ou@gmail.com no Seller Center; sete testes passaram e build OK, sem alteração de permissões.
- [ ] Conferir visualmente a aba na conta correta: sessão foi preparada, mas /vendedor permanece em branco na prévia e impede conferir um pedido real.
- [x] Corrigir duplicação que bloqueava abertura; relatório com fotos assinadas, CPF, número e bairro capturados nos próximos pedidos, relatório copiável e ausência explícita nos antigos; dez testes passaram.
- [x] Rastreio atômico validado por loja/pedido pago; sete etapas compartilhadas com comprador e atualização por eventos com recuperação periódica; código não inventa despacho. Estrutura conferida no banco.
- [ ] Conferência completa vendedor → comprador: sessão disponível não possui loja aprovada, portanto aba com pedido real não foi validada.
- [ ] Rastreio automático por transportadora depende de API autorizada/credenciais; só o código Amazon não fornece eventos. Atualização de etapas permanece manual.

## Estoque Amazon — 28/10
- [ ] Detectar indisponibilidade na importação, revisar catálogo em lotes programados e bloquear checkout sem confirmação atual; manter variantes sem confirmação bloqueadas.

## Varredura cirúrgica — 28/10
- [x] Corrigir fila CJ que abandonava itens após os primeiros 24 e selecionar cotação da loja/produto certo; remover atualização automática de todas as páginas do catálogo. Banco sem pressão (47% memória, 13/60 conexões); preços/pagamentos preservados; testes passaram.
- [ ] Voltar migrado para histórico do roteador com sentinela por gesto e regras testadas; validação visual bloqueada porque módulos da prévia não terminam de carregar, mesmo após recuperação e teste novo de 120 segundos. Não declarar comportamento nativo homologado.
- [x] Manual, lote de links e robô extraem cores/tamanhos/modelos presentes no HTML; testes passaram. Estoque continua não confirmado e opções bloqueadas; catálogo antigo não foi recapturado. JSON/manual sem HTML mantém grade explicitamente de referência.
- [ ] Liberar escolha comprável das variantes Amazon e atualizar catálogo antigo: depende de dados confirmados de cada variante, preço/estoque e fornecimento autorizado; rótulos extraídos não bastam para garantir entrega.

## Origem na vitrine e pedidos Amazon — 28/10
- [x] Trocar somente rótulos públicos CJ/Amazon por Produtos internacionais/Produtos nacionais, preservando identificação no Admin e filtros existentes.
- [x] Novos nomes conferidos visualmente no celular e build OK; cliques no navegador de teste não alteraram seleção/URL, então a interação não foi validada. Conferido que Amazon não envia pedidos automaticamente: integração com auto_fulfill=false e processadores exclusivos CJ. Automação de compra Amazon depende de fornecimento/API oficialmente autorizados; nenhuma compra realizada.

## Fornecedores, grades Amazon e busca — 27/10
- [x] Separar CJ/Amazon na vitrine e lista administrativa; navegador validou 24 CJ/13 Amazon e Admin com 13 Amazon.
- [x] Preparar grades Amazon P/M/G/GG/XG e 34–44 em cadastro individual/lotes; 18 testes passaram. Sem disponibilidade oficial, grade bloqueada e novos vestuários com estoque zero; teste visual do importador bloqueado pela conta sem acesso à aba.
- [x] Busca cruza índice de título, descrições, ficha e categoria; consulta real de fone à prova d'água retornou 20 produtos sem erro; build OK.

## Pressão no Lovable Cloud — 27/10
- [x] Saúde conferida duas vezes: memória 71–75%, disco 78%, conexões 24/60, zero reinícios; alerta histórico DiskIO às 00:13 UTC, sem prova de pressão contínua atual. Consulta de variantes com índice existente; CJ faz leituras por variante e escritas repetidas, products ocupa 1201MB (900MB de conteúdo grande). Schedules e custos verificados; recomendar otimizar primeiro, sem resize nem alteração de cron. Pico/Micro/Small: 55,74/74,30/120,74 créditos solicitados por 720 horas antes de cobertura; sem economia financeira comprovada.

## HS Bank — 27/10
- [x] Espelho de liquidação Mercado Pago sem API externa; referência de crédito de 30% das vendas pagas em 30 dias calculada por SQL do titular e salva na solicitação, análise de 90 dias sem promessa de aprovação. Doze testes passaram; tela autenticada sem loja aprovada validada sem erros, build OK.
- [ ] HSBANK50 sem reserva externa: bloqueado porque não há cobertura financeira/identidade verificada/resgate atômico integrado; R$150 de produtos com comissão de 12% gera R$18, não R$50. Não retirar diferença de fornecedor/vendedor nem alegar custo zero.
- [x] Carteira azul com Loop, saldo interno ocultável, extrato de até 50 registros reais, acesso no menu/painel vendedor. Conta autenticada sem loja e celular validados, sem erro ou transbordamento; build OK.
- [x] Interesse em crédito persistido via RPC, protegido por loja aprovada e vendas pagas nos últimos 30 dias; sem concessão de dinheiro ou mudança no split. Dez testes de regras passaram.
- [x] Hugo confirmou manter a comissão de 12%; extrato preserva os valores reais de cada transação.
- [ ] Validar saldo, extrato e solicitação no fluxo de lojista elegível: a conta disponível no teste não tem loja aprovada; precisa de sessão de um proprietário elegível.
- [x] Alternativa autorizada por Hugo: painel espelha liquidação na conta Mercado Pago da loja e botão consulta essa conta; não realiza saque direto nem consulta saldo bancário. Pix automático continua indisponível sem capacidade oficial autorizada.
- [ ] Crédito real e retenção de 15%: dependem de produto/API habilitado e instituição/contrato autorizados; split atual não confirma essas capacidades.
- [ ] Ativar HSBANK50: política e testes preparados (primeira compra/R$150/R$50/10/CPF/dispositivo), mas sem emissão ou resgate. Precisa de verba própria, verificação real de identidade e reserva/resgate atômicos integrados ao checkout; desconto não pode consumir margem CJ.

## Entrega estimada e boleto — 26/10
- [x] Verificar Alelo alimentação: não há suporte online confirmado no Mercado Pago; não oferecer como cartão comum. Depende de credenciamento e compras elegíveis de alimentos.
- [x] Exibir datas estimadas pelos limites cotados, identificar produtos CJ internacionais e remover prazo fixo inventado; projeção CJ em dias corridos explicitamente condicionada ao envio, preparação e alfândega. Detalhe/carrinho reais validados.
- [x] Adicionar boleto por loja com CPF validado, endereço obrigatório, consulta de método disponível, boleto/código oficial persistidos e reconciliação/webhook; formulário real do pedido validado e pedido cancelado sem cobrança. 22 testes passaram.
- [ ] Homologar emissão/compensação real do boleto e split: requer pagador com CPF/endereço próprios e conta Mercado Pago elegível; nenhuma cobrança gerada nesta etapa.

## Preço por endereço salvo e economia — 26/10
- [x] Consultar preços CJ pelo CEP do endereço salvo na vitrine/detalhe e reutilizar cotação válida de mesmos itens no carrinho; mudanças exigem aceite explícito, sem preço final inventado. Teste real: R$123,68 na vitrine, detalhe e carrinho.
- [x] Mostrar “Você economizou” somente com preços anteriores registrados sob condições comparáveis; referências CJ sem envio confirmado excluídas. 17 testes passaram; fluxo autenticado e apresentação no celular verificados, sem cobrança.

## Proteção financeira e correções — 26/10
- [x] Auditar 15.031 produtos CJ pais, comparar quatro custos oficiais e zerar itens abaixo do custo após comissão; piso por trigger protege novas alterações e checkout exige cotação com margem. Pedido real sem cobrança criado/cancelado com estoque restaurado. Taxas Mercado Pago e impostos externos não verificados; não garantir lucro líquido.
- [x] Substituir preferência de checkout por Pix direto com CPF, QR/copia-cola e reconciliação protegida; API confirmou Pix ativo e testes passaram, admin permanece grátis.
- [ ] Validar QR real do Clube: precisa de ação de uma conta não administradora com CPF próprio; não gerada cobrança no CPF inventado nem cobrado admin.
- [x] Troca real de roupa L→M e calçado verificada; opções sem estoque salvo podem confirmar estoque oficial ao clicar, sem inventar disponibilidade.
- [x] Banner encurtado e conferido no celular (322px de altura); foto do banner um pouco maior (193px no celular) mantendo o quadrado sem cortar cabeça, orelhas ou texto da arte.
- [x] Foto da Conta agora persistida no perfil; Social guarda caminho privado e renova assinatura; imagem privada recuperada e exibida. Recebimento em segunda conta não verificado.
- [ ] Notificações fora do site: conexão Firebase não concluída; envio não implementado sem serviço configurado.

## Ampliar tradução gratuita — 26/10
- [x] Confirmar MyMemory: 50.000 caracteres/dia com contato válido, conforme página oficial; e-mail autorizado por Hugo.
- [x] Configurar envio do contato e reserva compartilhada conservadora de 45.000 bytes/dia, preservando cache e sem IA paga; clientes antigos mantêm teto anônimo.
- [x] Testar título real salvo e ficha oficial com 18 especificações; ficha do mesmo produto salva e exibida, cache reutilizado e sete testes aprovados. Novo limite nos jobs públicos depende da publicação; catálogo completo continua gradual.

## HS Social — presença e mensagens — 25/10
- [x] Acesso premium gratuito permanente via papel administrador; RPC real e página do Clube validados, cobrança bloqueada nos handlers.
- [x] Notificações persistidas e sino dentro da HS Social; teste de foto gerou exatamente um aviso ao destinatário, removido após teste. Listener existente permanece único.
- [x] Presença verde/vermelha por heartbeat, digitação por conversa com expiração e visualização apenas com conversa visível. Digitação real e limpeza validadas; cinco testes passaram. Não foi feito teste simultâneo com duas contas nesta etapa.
- [x] Fotos privadas corrigidas por leitura participante/grupo; foto antiga decodificou e foto nova enviada/reaberta após recarga, depois removida. Build final OK.

## Tradução CJ sem IA paga — 25/10
- [x] Substituir tradução paga de títulos/descrições por MyMemory com cache, teto preventivo de 4.000 bytes/dia e retomada no dia seguinte, sem chamadas na vitrine; não há garantia de tradução grátis ilimitada.
- [x] Conferir preservação de tamanhos, cores, IDs e estoque oficiais; dados de estoque inválidos não mudam disponibilidade, chaves atualizadas no job agendado.
- [x] Restringir leitura direta de comentários fixados a autor/admin e ler um post por RPC autenticada no feed.
- [x] Testar tradução gratuita real: lote de 29 títulos persistido, 14 testes passaram e build OK. Fichas não executaram neste teste porque a fila estava ocupada; catálogo completo continua gradual.

## Solicitação atual — 24/10
- [x] Opções oficiais CJ preservadas para roupas, calçados e demais variantes; opções sem estoque ficam bloqueadas e voltam após reposição confirmada pela atualização programada.
- [ ] Atualização instantânea CJ: depende de callback/openId oficial da CJ; hoje a atualização roda em lotes a cada 5 minutos, sujeita às cotas.
- [x] Clube HS por Pix de 1 mês, liberado somente após confirmação assinada do Mercado Pago.
- [x] Avisos persistentes de mensagens HS Social, compra aprovada e venda aprovada na barra de notificações.
- [x] HS Social com câmera e galeria separadas; áudio exclusivo do Clube no servidor e na tela.
- [x] HSTrends permite ao autor/Admin fixar e desfixar um comentário por post.
- [x] Convite de instalação na vitrine com logotipo atual e opção “Agora não”, sem modo offline.
- [x] Checkout reforçado: cotação exige conta e garantia é calculada no banco, sem valor vindo do navegador.
- [ ] Testes de cobrança real: Pix do Clube, venda aprovada e envio CJ ainda precisam de pagamento real em produção.

## Preços consistentes e importação de fornecedores
- [x] Mesmo preço salvo na vitrine e detalhe; navegação real até carrinho validada em R$71,90. Checkout mantém cotação oficial e pode recalcular: não foi garantida igualdade do total final por CEP.
- [x] Fichas em lotes de até 50, reutilizando JSON oficial, normalização técnica sem IA e progresso por produto; títulos deduplicados e compartilhados com variantes. Tradução integral sem IA não é garantida.
- [x] Opções CJ como produtos-filhos oficiais; escolha de cor/tamanho validada no navegador, ID preservado no carrinho e snapshot do pedido, com confirmação de estoque na cotação.
- [x] Pesquisar Amazon: importador atual é afiliado/manual; não ativar dropshipping sem contrato/API e operação compatíveis.
- [x] 17 testes e navegação real aprovados; lote real persistiu fichas e variantes.
- [ ] Homologar variante → cotação → pedido → envio CJ com estoque confirmado; teste não chegou à cobrança nem envio real.
- [ ] Igualar oferta ao total confirmado por CEP sem absorver prejuízo: teste real mostrou R$71,90 na vitrine/detalhe e R$154,90 após cotação; precisa unificar a oferta personalizada antes de anunciar preço final, não ignorar o custo CJ.
- [ ] Ativar sincronização CJ por eventos assinados: depende de publicação do callback e configuração/openId oficial; por enquanto há atualização agendada, sujeita às cotas.
- [ ] Concluir fichas e títulos de todo o catálogo: cotas CJ e créditos de tradução de títulos continuam necessários; dicionário técnico não traduz todo texto livre.
- [ ] Amazon automática: falta API autorizada e contrato de fornecimento; não implementada como dropshipping.

## Vitrine rápida e descoberta nas buscas
- [x] Reduzir dados do carregamento inicial de 546 KB para 280 KB, eliminar galerias/fichas na lista e leitura geral de categorias; preços e cotações preservados.
- [x] Compartilhar produto prefetched com renderização completa, canonical próprio e schema sem preços CJ não confirmados ou avaliações inventadas; sitemap validado com 10.757 produtos e quatro páginas públicas.
- [x] Validar fotos, paginação 24→48, navegação, busca, HTML de produto e áreas privadas fora do sitemap; 14 testes e build OK.
- [ ] Publicar para levar as melhorias ao site público; não solicitado nesta etapa.
- [ ] Verificar indexação e desempenho no Google após verificar a propriedade Search Console; acesso atual não cobre o site e nenhuma posição pode ser garantida.

## Oferta do Clube HS
- [x] Oferta mais convincente com benefícios reais; frete grátis com valor mínimo sem composição interna do preço; Disney/streaming e prioridade indisponíveis removidos. Página validada em computador e celular, sem alterar preços ou cobrança.

## Abertura e segurança das avaliações
- [x] Acrescentar destaques de Clube HS, afiliados, jogos/cupons e Rádio HS após Lupi: sequência, botão entrar e uma vez por sessão validados no celular; jogos validados na conta compradora.
- [x] Restringir acesso direto às fotos de avaliações ao proprietário; removida política pública e assinatura limitada a caminhos de avaliações lidas publicamente no servidor.

## Avaliações, rádio e Clube HS
- [x] Corrigir persistência de avaliações com fotos: envio na conta de Hugo, recarga e leitura pública com foto decodificada validados; avaliação temporária removida.
- [x] Corrigir reinícios por buffer e unificar players; transmissão MP3 avançou continuamente por 34 segundos com eventos de espera sem trocar conexão. 14 testes passaram incluindo preços/frete preservados.
- [ ] Validar áudio contínuo da emissora sertaneja e nova estação brasileira: transmissão AAC responde com áudio, mas não decodificou no navegador de teste; nova fonte autorizada não confirmada. Não há integração Spotify.
- [ ] Streaming, rádio de terceiros sem anúncios e entrega prioritária: dependem de parceria/licenciamento e serviço logístico confirmado; não prometer benefícios indisponíveis.
- [x] Clube HS suprime chamadas promocionais próprias para membros ativos e apresenta limites dos benefícios; frete embutido segue regra atual, sem alteração de cobrança ou promessa de Disney+.

## HS Social e Aura
- [x] Conversas privadas persistentes por número exato cadastrado no perfil; envio, resposta ao vivo e reabertura validados entre duas contas. Conta temporária removida.
- [x] Stories de texto e foto com expiração de 24 horas; publicação, reabertura e exclusão validadas.
- [x] Aura somente na vitrine; ausência na HS Social e conta validada, acesso sem login bloqueado.

## Correção do carrinho solicitada por Hugo
- [x] Restaurar somente duas modalidades de envio, preservando custos e prazos reais.
- [x] Garantir preço com frete grátis embutido já no produto, sem acréscimo surpresa no carrinho; validado produto → carrinho → pedido.

## Preço CJ com envio
- [x] Remover campos de cálculo dos produtos; consultar automaticamente o CEP do endereço salvo após login, priorizando o padrão. Cotação real automática validada na conta de Hugo; três testes de endereço passaram.
- [x] Confirmar custo CJ atual + envio oficial pelo CEP antes da margem por faixas; snapshots usados no carrinho e pedido sem duplicar frete. Pedido real sem cobrança conferido e cancelado; 14 testes passaram.
- [x] Atualizar custos base por fila agendada e preço com envio a cada nova cotação pelo CEP/serviço; lote real de 10 variantes validado. Atualização do catálogo completo ocorre gradualmente, sujeita aos limites CJ; rotina nova depende de publicação.

## Vitrine diária
- [x] Renovar diariamente a seleção de Todos, equilibrando categorias e priorizando vendas reais.
- [x] Validar seleção, paginação e preservação da busca e dos filtros: 12 categorias, mudança diária e páginas sem repetição; cinco testes passaram.

## Ajustes atuais do catálogo CJ
- [x] Mostrar total real de produtos CJ na aba Fornecedores (10.754, validado na loja JJ Kuster).
- [x] Melhorar busca por palavras, acentos e nomes de produtos (testes e busca real por relógio).
- [x] Implementar atualização de descrições e especificações oficiais em lotes retomáveis; 20 fichas consultadas e persistidas no teste.
- [x] Implementar tradução persistente com progresso e pausas; 7.026 títulos PT-BR, incluindo 50 traduzidos no teste.
- [ ] Concluir processamento do catálogo: 3.728 títulos e 10.734 fichas restantes; depende da publicação da nova rotina agendada e dos limites/créditos externos.

- [x] Exibir o Lupi empurrando um carrinho cheio e, depois, revelar “HS Digital Marketplace” e “Evoluindo com tecnologia” antes de entrar no site.

- [x] Bloquear carrinho e todas as páginas internas após o logout.
- [x] Ocultar a barra de tarefas e o carrinho sem uma sessão ativa.
- [x] Mostrar “Adicionado ao carrinho” em toda inclusão de produto.
- [x] Exibir aviso de login e bloquear ações privadas iniciadas sem sessão.
- [x] Controlar os quatro jogos por deslizes no celular e setas no computador.

- [x] Banco de dados: profiles, user_roles, stores, products, orders, order_items, platform_settings
- [x] Design system roxo/preto/branco
- [x] Home: banner, categorias, grid de produtos, filtros
- [x] Carrinho multi-loja com dados de entrega e pagamentos por loja
- [x] Seller Center: saldo, vendas do dia, cadastro de produto
- [x] Painel Admin: comissão e aprovação de lojas
- [x] Login (e-mail/senha + Google)
- [x] Usar a logo enviada pelo usuário no header, rodapé e ícone da aba
- [x] Revisão pré-publicação: páginas, produtos, imagens, carrinho, links e WhatsApp
- [x] Cadastro real com escolha entre Comprador e Vendedor
- [x] Estoque transacional e comissão automática por venda
- [x] Remover checkout via WhatsApp e criar checkout automático por Pix/Cartão, separado por loja
- [x] Permitir conexão das contas Mercado Pago dos vendedores e aplicar comissão automática por pagamento
- [x] Criar configuração segura e aba de transações Mercado Pago no painel Admin
- [x] Conceder acesso Admin mestre ao usuário solicitado com validação segura no banco
- [x] Corrigir acesso público indevido às imagens privadas de produtos
- [x] Remover o mascote Loop da Home
- [x] Adicionar filtros laterais, autocomplete e ordenação ao catálogo
- [x] Criar página completa de detalhes do produto
- [x] Registrar carrinhos abandonados de usuários autenticados
- [x] Adicionar 20 produtos fictícios com imagens próprias sem remover os 8 atuais
- [x] Informar claramente os bloqueios restantes para vendas reais e publicação

- [x] Adicionar liberação segura de produtos digitais após pagamento confirmado
- [x] Criar página de confirmação e acompanhamento do pedido do comprador
- [x] Validar webhook Mercado Pago, idempotência e devolução de estoque
- [x] Validar o payload final contra o exemplo enviado, mantendo `application_fee` calculado pela comissão vigente
- [ ] Ativação externa: salvar credenciais de produção, registrar a URL do webhook e conectar cada conta vendedora
- [ ] Homologação externa: realizar e estornar uma compra real de baixo valor após a ativação
- [x] Corrigir cadastro seguro de produtos e permitir até 10 fotos ou vídeos
- [x] Remover mascote e transformar categorias em carrossel
- [x] Ampliar menu da conta com compras e notificações reais
- [x] Eliminar travamento do checkout com bloqueios ordenados e limite de espera
- [x] Corrigir a recusa do Mercado Pago ao gerar pagamentos Pix
- [x] Corrigir o cadastro de produtos com fotos privadas
- [x] Adicionar uma área dedicada “Meus produtos” no painel do vendedor
- [x] Corrigir a geração de Pix e adicionar reconciliação do pagamento com o Mercado Pago
- [x] Permitir dispensar notificações e cancelar pedidos não pagos com devolução de estoque
- [x] Adicionar endereços salvos e preencher o endereço padrão no checkout
- [x] Adicionar mensagens por pedido, atendimento no Admin e badge de mensagens
- [x] Adicionar acompanhamento de entrega em cinco etapas
- [x] Adicionar roleta, raspadinha interativa, cobrinha e cupons de frete válidos por 24 horas.
- [x] Permitir usar cupons ganhos nos jogos durante o checkout, com teto de R$ 30.
- [x] Adicionar entrada por biometria/passkey, com cadastro após autenticação e credenciais protegidas por usuário.
- [x] Restringir Jogos & Prêmios a compradores e ocultar o acesso de contas vendedoras.
- [x] Corrigir os rótulos da roleta e transformar cada jogo em uma experiência de tela inteira.
- [x] Melhorar a cobrinha e adicionar Pac-Man, Flappy Bird e corredor de estrada, sem prêmios por partida isolada.
- [x] Somar moedas dos quatro jogos e liberar cupom de 10% no frete a cada 1.000 moedas.
- [x] Tornar os jogos mais difíceis após 500 moedas e limitar frete grátis de até R$ 30 a uma vez por mês por usuário.
- [x] Exibir “Vem brincar na HS e concorra a prêmios” antes de iniciar cada jogo.
- [x] Ajustar a roleta para quatro áreas grandes e legíveis conforme a referência enviada.
- [x] Exibir o acesso a Jogos & Prêmios abaixo do aviso de frete grátis da primeira compra, sem mostrar para vendedores.

- [x] Adicionar descrição longa ao cadastro de produto e persistir no catálogo.
- [x] Adicionar aba Painel do Vendedor com pedidos da loja.
- [x] Permitir que o vendedor avance/ajuste as cinco etapas de entrega.
- [x] Atualizar o rastreio do comprador em tempo real.
- [ ] Validar o fluxo vendedor → acompanhamento do comprador.

## Integração de fornecedores e logística

- [x] Calcular frete real por CEP no checkout e eliminar a tarifa fixa de R$ 19,90.
- [x] Disparar o envio automático à CJ no webhook após a confirmação do pagamento.
- [ ] Ativar o Melhor Envio em produção com as credenciais da plataforma; vendedores já podem conectar a própria conta, informar CEP de origem e cadastrar dimensões.
- [x] Fazer a vitrine abrir com produtos atuais já carregados, sem baixar nem renderizar todo o catálogo de uma vez.
- [x] Traduzir para português os títulos e descrições dos produtos CJ já importados e das próximas sincronizações.
- [x] Integrar catálogo e estoque da CJ Dropshipping à loja JJ Kuster.
- [x] Usar categorias populares da CJ como padrão e publicar os produtos importados na vitrine.
- [x] Ampliar o catálogo CJ para doze linhas variadas com cinco produtos populares por linha.
- [ ] Importar gradualmente até 20 produtos reais de todas as categorias oficiais da CJ (fila iniciada; conclusão depende dos limites diários do fornecedor).
- [x] Converter custos em USD da CJ pela cotação de venda USD/BRL do Banco Central antes de aplicar a margem e corrigir os produtos já importados.
- [x] Priorizar na fila da CJ fones, Bluetooth, smartwatches, caixas de som e eletrônicos de consumo.
- [x] Priorizar ferramentas, celulares, televisores e peças/acessórios automotivos e de motos, preservando a margem da loja.
- [ ] Remover a integração Dropi Nacional e substituí-la por um fornecedor brasileiro confiável que aceite cadastro somente com CPF, preferencialmente sem mensalidade, com integração simples e margem automática de 35% (em avaliação).
- [x] Encaminhar pedidos pagos da CJ aos fornecedores com processamento idempotente.
- [ ] Integrar rastreamento oficial dos Correios — aguardando contrato PJ e credenciais CWS; códigos do fornecedor já aparecem no acompanhamento.
- [x] Remover apenas produtos fictícios, preservando cadastros reais.

- [ ] Aplicar frete totalmente grátis automaticamente na primeira compra paga do comprador.
- [ ] Traduzir para português todos os produtos importados que ainda aparecem em inglês.

- [x] Centralizar verticalmente a passagem do Lupi e aumentar sua duração para 3 minutos, mantendo as frases no final.

- [x] HS Social: foto de perfil em tela cheia ao tocar
- [x] HS Social: chamadas de áudio e vídeo (só com HS Social aberto; sem servidor TURN)
- [x] HS Social: melhorar botão de gravar áudio

## Biometria no login (pedido 26/10)
- [ ] Cadastro de digital/biometria na tela de login e autenticação sem senha (atenção: biometria já causou falha de abertura no deploy antes — testar bem)
- [x] Avaliações: 3-4 comentários por produto com nomes/cidades únicos (testado em 2 produtos, sem repetição)
- [x] Recomendados: seção criada na página do produto, só mesma categoria (testado)
- [ ] Biometria no login (cadastro de digital + entrada sem senha)
- [x] Varredura de desempenho geral (lentidão/travamentos)
