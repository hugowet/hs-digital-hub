# Biometria e central de jogos para compradores

## Resultado
- A entrada terá a opção **Entrar com biometria**, usando a proteção nativa do celular ou computador.
- A biometria será cadastrada dentro de **Minha conta**, após a pessoa entrar normalmente; nenhuma impressão digital será copiada ou armazenada pela HS Digital.
- **Jogos & Prêmios** e **Meus cupons** ficarão disponíveis apenas para contas compradoras e deixarão de aparecer para vendedores.
- A área de jogos será refeita em tela cheia, com uma apresentação antes de cada partida: **“Vem brincar na HS e concorra a prêmios”**.

## Entrada por biometria
- Usar credenciais seguras do aparelho (passkeys/WebAuthn), permitindo Face ID, impressão digital, PIN ou desbloqueio equivalente conforme o dispositivo.
- Permitir cadastrar, nomear e remover mais de um aparelho em **Minha conta**.
- Exigir uma sessão já autenticada para cadastrar uma nova biometria e validar cada tentativa no servidor.
- Oferecer entrada biométrica sem expor e-mails; manter e-mail/senha e Google como alternativas.
- Guardar somente a chave pública e os dados técnicos da credencial, nunca a biometria.

## Jogos e visual
- Corrigir a roleta para manter todos os nomes centralizados e legíveis em suas faixas.
- Manter somente a **Roleta** e a **Raspadinha** como prêmios diários diretos.
- Melhorar a **Cobrinha** e adicionar:
  - **Come-Come**: labirinto, pastilhas e fantasmas.
  - **Flappy Bird**: toque, clique ou espaço para passar pelos canos.
  - **Desvia e Coleta**: carro em três pistas, obstáculos e moedas.
- Cada jogo abrirá como uma experiência própria em tela cheia, com controles para celular e teclado.
- Os jogos de moedas começam acessíveis e aceleram/adicionam obstáculos depois de 500 moedas.

## Moedas, cupons e proteção do lucro
- Somar no servidor as moedas válidas dos quatro jogos: Cobrinha, Come-Come, Flappy Bird e Desvia e Coleta.
- A cada 1.000 moedas acumuladas, emitir automaticamente um cupom de **10% no frete**, mantendo o teto atual de desconto.
- Validar sessões, tempo e limites de pontuação no servidor para impedir envio artificial de moedas pelo navegador.
- Limitar o prêmio **frete grátis até R$ 30** a uma concessão por mês para cada comprador; se a roleta ou raspadinha sortear novamente, entregar outro resultado permitido.
- Preservar o limite diário atual da roleta e da raspadinha.

## Segurança e validação
- Manter proteção por usuário em credenciais, moedas, partidas e cupons, com permissões mínimas.
- Bloquear vendedores também no servidor, não apenas escondendo os botões.
- Testar cadastro e entrada biométrica em navegador compatível, rejeição de credencial diferente, os quatro jogos em celular e computador, progressão após 500 moedas e emissão única dos cupons.
- Confirmar compilação, navegação por tipo de conta e executar nova verificação de segurança.

## Detalhes técnicos
- A biometria usará WebAuthn/passkeys com credenciais descobríveis; a autenticação validada emitirá uma sessão normal da conta.
- Desafios biométricos serão aleatórios, temporários e de uso único.
- O saldo de moedas e os marcos de 1.000 serão transacionais para não gerar cupons duplicados.
