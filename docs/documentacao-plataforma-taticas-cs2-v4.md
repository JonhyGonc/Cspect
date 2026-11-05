# Documentação de Planejamento — Plataforma de Táticas de CS2

> Documento de especificação para orientar a implementação do projeto. Reúne as decisões aprovadas pelo usuário até a data de elaboração e registra as pendências em aberto.

**Status:** planejamento concluído, aguardando início do desenvolvimento.
**Data de referência:** 05/11/2026.
**Versão:** 4 (mapas do MVP produzidos em PNG, pendências resolvidas e revisão jurídica prevista para antes da publicação pública).

---

## 1. Visão geral do produto

Plataforma web para criar, editar, organizar e compartilhar táticas de Counter-Strike 2 (CS2). O usuário monta táticas diretamente sobre o mapa visto de cima: posiciona jogadores, desenha movimentações, indica utilitários e grava sequências animadas por uma linha do tempo.

O diferencial está na combinação de três elementos: o editor visual sobre o mapa, a organização dos jogadores por funções táticas e a biblioteca pesquisável por filtros de estratégia.

---

## 2. Objetivos e público-alvo

### Objetivos

- Permitir que o jogador monte uma tática de forma rápida e visual.
- Organizar táticas por mapa, lado, estilo e objetivo, para consulta futura.
- Facilitar o compartilhamento de táticas entre jogadores, criando uma base para uma comunidade.

### Público-alvo

- **Jogadores individuais** que querem estudar e registrar estratégias.
- **Equipes** que precisam alinhar jogadas (a colaboração em equipe fica para uma fase posterior).
- **Treinadores e analistas**, que podem usar a biblioteca como referência.

---

## 3. Escopo do projeto

**Dentro do escopo:**

- Editor de táticas sobre os sete mapas do MVP, reconstruídos pela equipe.
- Cadastro de jogadores com funções.
- Planos fixos e sequências animadas.
- Biblioteca com filtros e publicação pública.
- Cadastro e login próprios.
- Denúncia de conteúdo.

**Fora do escopo do MVP:**

- Colaboração em equipe com permissões.
- Versão para celular.
- Comentários, curtidas e perfis sociais.
- Recuperação automática de senha.
- Prévia animada ao passar o mouse.
- Upload de fotos de perfil.
- Análise de partidas e integração com estatísticas.
- Login com Google.
- Nomes de posições no mapa (ex.: "varanda" na Dust II).
- Mapas além dos sete do MVP.

---

## 4. Lista de funcionalidades

### Essenciais (MVP)

| Funcionalidade | Descrição |
|---|---|
| Cadastro e login | Conta com e-mail e senha, com bloqueio após tentativas erradas. |
| Gerenciamento de jogadores | Nickname, avatar com iniciais, função principal e funções secundárias, observações. |
| Seleção de mapa | Escolha entre sete mapas do MVP: Ancient, Nuke, Mirage, Inferno, Dust II, Cache e Anubis, reconstruídos pela equipe. |
| Editor de táticas | Posicionamento de jogadores, desenho de movimentações e utilitários no mapa. |
| Desenho de caminho | Modo próprio de desenho, confirmado com "definir caminho". |
| Utilitários | Smoke, flash, molotov e HE, com posição de impacto e trajetória opcional. |
| Sequências animadas | Linha do tempo com marcações manuais ou automáticas, reprodução e velocidade ajustável. |
| Biblioteca de táticas | Organização por mapa, busca e filtros. |
| Publicação pública | Táticas publicadas com nome de exibição do autor visível. |
| Denúncia e remoção | Qualquer usuário pode denunciar; o administrador pode remover. |
| Termo de uso | Texto simples explicando regras, dados guardados e a relação com a Valve. |
| Desfazer e refazer | Disponível para todas as ações do editor. |

### Secundárias (pós-MVP)

- Prévia animada da tática ao passar o mouse sobre o cartão.
- Upload de avatar em imagem.
- Recuperação automática de senha por e-mail.
- Lista completa de funções e funções personalizadas.
- Novos estilos de jogo adicionados à lista fixa.
- Login com Google, com custo a confirmar nas fontes oficiais.
- Nomes de posições no mapa, como "varanda" na Dust II, usados como referência nas táticas.
- Mapas além dos sete do MVP.

### Futuras

- Controle de equipe, com contas de vários membros, convites e permissões.
- Versão para celular.
- Comunidade completa: comentários, curtidas, perfis e seguidores.
- Análise de partidas e integração com estatísticas.

---

## 5. Requisitos funcionais

**RF01 — Cadastro e login.** O sistema permite criar conta com e-mail e senha, fazer login e logout.

**RF02 — Bloqueio por tentativas.** Após cinco tentativas erradas de login, a conta fica bloqueada por alguns minutos.

**RF03 — Recuperação manual de senha.** A redefinição de senha é feita manualmente, sem envio automático de e-mail no MVP.

**RF04 — Cadastro de jogadores.** O usuário cadastra jogadores com nickname, avatar com iniciais, função principal, funções secundárias e observações.

**RF05 — Funções como sugestão.** O sistema lista as funções disponíveis (Entry Fragger, AWPer, Lurker, Support, IGL, Anchor) como sugestão.

**RF06 — Sugestão automática.** Ao montar uma tática, o sistema sugere quem ocupa cada função com base na função principal de cada jogador. A sugestão preenche apenas posições vazias. O usuário pode aceitar ou trocar.

**RF07 — Seleção de mapa.** O usuário escolhe um dos sete mapas do MVP (Ancient, Nuke, Mirage, Inferno, Dust II, Cache e Anubis) para montar a tática. Os mapas são imagens próprias da equipe, conforme RNF13.

**RF08 — Posicionamento de jogadores.** O usuário arrasta um jogador do elenco para o mapa. Arrastar um jogador muda apenas sua posição. A posição guarda o jogador cadastrado e também a função usada naquela tática, que pode ser trocada sem alterar o cadastro do jogador. As posições são gravadas em coordenadas normalizadas (de 0 a 1) em relação ao mapa.

**RF08A — Remoção de jogador.** Ao remover um jogador da equipe, as táticas não são apagadas. A posição do jogador permanece com a função, sem jogador vinculado.

**RF09 — Desenho de caminho.** O usuário ativa um modo de desenho, traça um trajeto e o grava com "definir caminho" no botão direito. Traço não confirmado fica em rascunho, salvo no banco, e não bloqueia outras ações.

**RF10 — Utilitários.** O usuário adiciona smoke, flash, molotov ou HE, escolhidos numa barra de ferramentas, com posição de impacto. A trajetória de arremesso é opcional.

**RF11 — Duração de utilitários.** Smokes e molotovs exibem duração na linha do tempo, com tempo padrão por tipo que pode ser ajustado. A duração padrão segue a do jogo: smoke de cerca de 18 segundos e molotov de cerca de 7 segundos (valor do smoke a confirmar no jogo, pois as fontes consultadas divergem entre 18 e 20 segundos). Flashes e HE aparecem como um momento.

**RF12 — Plano fixo.** Cada tática tem um plano fixo, com jogadores, movimentações e utilitários.

**RF13 — Sequências animadas.** A tática pode ter uma ou mais sequências, que podem ser montadas do zero, independentes do plano fixo.

**RF14 — Linha do tempo.** A linha do tempo aceita marcações manuais e automáticas. Ao alterar o plano dentro de uma sequência, uma marcação pode ser criada automaticamente. Entre duas marcações consecutivas, a posição de cada jogador e de cada utilitário é interpolada de forma linear. Um utilitário aparece na marcação em que é criado e some na marcação em que é removido.

**RF15 — Reprodução.** A sequência pode ser tocada, pausada e reiniciada. A velocidade de reprodução pode ser ajustada.

**RF16 — Desfazer e refazer.** Todas as ações do editor podem ser desfeitas e refeitas. Um arraste completo é uma única ação.

**RF17 — Biblioteca.** As táticas são organizadas por mapa e podem ser pesquisadas.

**RF18 — Filtros.** A biblioteca filtra por:
- Lado (T ou CT).
- Tipo de execução: Rush, Split, Exec, Fake, Default, Contact.
- Condição econômica: Eco, Anti-eco, Force Buy, Half Buy, Full Buy.
- Objetivo tático: Map Control, Pick, Retake, Post-Plant, Lurk.
- Quantidade de jogadores, calculada automaticamente pelo plano.

Uma tática pode ter mais de uma opção em cada uma das três categorias de execução, condição econômica e objetivo. As opções podem ser combinadas dentro de cada categoria e entre categorias.

**RF19 — Cartão de tática.** Cada item da biblioteca mostra nome, mapa, lado, filtros, número de jogadores, data da última alteração e miniatura do plano fixo, gerada a partir dos dados do plano.

**RF20 — Publicação.** O usuário pode publicar uma tática na biblioteca pública. O nome de exibição do autor fica visível.

**RF21 — Denúncia.** Qualquer usuário pode denunciar uma tática publicada, uma única vez por tática. Depois da denúncia, a tática fica oculta apenas para quem denunciou; para os demais usuários, continua visível até a análise do administrador.

**RF22 — Remoção.** O administrador pode remover táticas denunciadas ou inadequadas.

**RF23 — Termo de uso.** O usuário visualiza e aceita um termo de uso no cadastro. O aceite é registrado com a versão do termo e a data. O termo deve apresentar, no mínimo:
- A plataforma é independente e não possui vínculo oficial com a Valve Corporation.
- Counter-Strike 2 e seus elementos de propriedade intelectual pertencem aos respectivos titulares.
- As representações gráficas dos mapas foram reconstruídas pela equipe do projeto.
- A reconstrução gráfica não representa transferência de propriedade intelectual nem reivindicação de titularidade sobre os mapas.
- A utilização dos nomes dos mapas tem finalidade de identificação e compatibilidade com o jogo.
- A plataforma não é patrocinada, aprovada ou endossada pela Valve.
- O canal de contato para o titular dos dados (contato.cspect@gmail.com).

**RF24 — Exclusão de conta.** Ao excluir a própria conta, as táticas privadas são removidas junto com ela. As táticas públicas permanecem na biblioteca, com o autor exibido como "usuário desconhecido".

---

## 6. Requisitos não funcionais

**RNF01 — Desempenho.** O editor responde às ações do usuário (arrastar jogadores, desenhar traços e navegar pela linha do tempo) sem atraso perceptível. Os dados são salvos em segundo plano, sem interromper a edição. O salvamento ocorre com atraso de cerca de 1,5 segundo após a última alteração e também ao sair da tática.

**RNF02 — Segurança das senhas.** As senhas nunca são armazenadas em texto puro. Utiliza-se função de hash específica para senhas.

**RNF03 — Controle de acesso.** Cada usuário edita apenas as próprias táticas e jogadores. Táticas privadas não são acessíveis a outros usuários.

**RNF04 — Validação no servidor.** Todos os dados recebidos são validados no servidor antes de serem salvos, independentemente da validação no navegador.

**RNF05 — Sessão.** A sessão é mantida por cookie seguro e expira após um período de inatividade.

**RNF06 — Proteção contra abuso de login.** Limite de tentativas por conta, conforme RF02.

**RNF07 — Backup.** O banco de dados deve ter cópias regulares, para recuperação em caso de perda ou erro.

**RNF08 — Proteção de dados pessoais.** O sistema coleta somente os dados necessários. O usuário pode excluir a própria conta, conforme RF24. O termo de uso explica quais dados são armazenados e informa o canal de contato do titular: contato.cspect@gmail.com. Deve-se verificar a aderência à LGPD antes da publicação pública.

**RNF09 — Compatibilidade de navegadores.** Chrome, Edge, Firefox e Safari, nas versões atuais.

**RNF10 — Resolução mínima.** Telas a partir de 1280 px de largura. Em resoluções menores, a interface exibe aviso sobre a experiência em telas maiores.

**RNF11 — Escalabilidade inicial.** O MVP deve suportar um usuário em desenvolvimento e algumas dezenas de usuários após a publicação.

**RNF12 — Gratuidade das funcionalidades básicas.** As funcionalidades básicas do site devem permanecer gratuitas, conforme a política oficial de uso de imagens de mapas da Valve.

**RNF13 — Mapas próprios.** Os mapas exibidos no editor e na biblioteca são imagens próprias da equipe, em formato PNG. Não são usadas imagens originais do radar oficial como arquivo de fundo, nem como base de decalque ou sobreposição. Os mapas foram produzidos por IA a partir de descrições escritas pela equipe, sem imagens originais como referência. A resolução mínima dos PNGs será definida após o teste de nitidez na T4.1, em telas de alta densidade. Se necessário, os mapas serão regenerados em maior resolução.

**Registro de decisão (RNF13):** a versão 3 exigia arquivos vetoriais. Esse requisito foi alterado para PNG porque a conversão para vetor ficou com qualidade insuficiente para o editor.

---

## 7. Fluxos de usuário

### Fluxo 1 — Primeiro acesso

1. Usuário acessa a página inicial.
2. Cria conta com e-mail e senha, e aceita o termo de uso.
3. Faz login.
4. Chega à biblioteca de táticas, vazia, com a opção de criar a primeira tática.

### Fluxo 2 — Cadastro de jogador

1. Usuário abre a área de jogadores.
2. Cria um jogador com nickname, função principal e funções secundárias.
3. O jogador fica disponível na lateral do editor.

### Fluxo 3 — Criação de tática

1. Usuário clica em "Nova tática" e escolhe um dos sete mapas do MVP.
2. No editor, arrasta jogadores do elenco para o mapa.
3. O sistema sugere quem ocupa cada função em posições vazias, e o usuário pode trocar.
4. Usuário adiciona utilitários pela barra de ferramentas e, se quiser, desenha trajetórias.
5. Usuário confirma os caminhos com "definir caminho".
6. Salva a tática. O número de jogadores é calculado automaticamente.

### Fluxo 4 — Criação de sequência animada

1. Dentro da tática, usuário abre a linha do tempo e cria uma sequência, do zero ou a partir do plano.
2. Adiciona marcações de tempo e posiciona jogadores e utilitários em cada uma.
3. Reproduz a sequência com os botões de tocar, pausar e voltar, ajustando a velocidade se necessário.

### Fluxo 5 — Publicação e denúncia

1. Usuário publica uma tática na biblioteca pública.
2. Outro usuário visualiza a tática e, se achar inadequada, clica em denunciar.
3. A tática deixa de aparecer para quem denunciou.
4. O administrador analisa a denúncia e pode remover a tática.

### Fluxo 6 — Consulta na biblioteca

1. Usuário abre a biblioteca, organizada por mapa.
2. Aplica filtros de lado, execução, economia, objetivo e quantidade de jogadores.
3. Abre uma tática encontrada.

---

## 8. Estrutura de páginas

| Página | Conteúdo principal |
|---|---|
| Login e cadastro | Formulário de e-mail e senha, aceite do termo de uso. |
| Biblioteca | Táticas organizadas por mapa, busca, filtros e cartões. |
| Editor de tática | Mapa central, elenco à esquerda, barra de utilitários no topo e linha do tempo na parte inferior. |
| Jogadores | Lista de jogadores e formulário de cadastro e edição. |
| Minhas táticas | Táticas do usuário, privadas ou publicadas. |
| Termo de uso | Texto com regras, dados armazenados, relação com a Valve e canal de contato. |
| Administração | Lista de denúncias e ações de remoção. |

**Observação:** a posição da barra de utilitários (topo) e da linha do tempo (parte inferior) está definida.

---

## 9. Diretrizes visuais

- **Tema:** escuro como padrão.
- **Estética:** inspirada no CS2, com fundo escuro e cores de destaque, sem copiar logotipos, nomes ou ícones da Valve.
- **Estilo geral:** clean, minimalista e funcional, sem excesso de elementos decorativos.
- **Mapas:** imagens PNG próprias, produzidas pela equipe (RNF13), usadas como base do editor e da biblioteca.
- **Paleta aprovada:**
  - fundo principal: #14161A;
  - painéis: #1E2227;
  - destaque (ações principais): #F5A623;
  - jogadores T: #E07B39;
  - jogadores CT: #4A90D9;
  - texto principal: #E8EAED.
- **Responsividade:** apenas desktop no MVP.

---

## 10. Arquitetura conceitual

- **Frontend:** React com TypeScript, estilizado com Tailwind CSS.
- **Editor:** Konva, com react-konva, para mapa, jogadores, traços e utilitários.
- **Backend:** Python com FastAPI.
- **Comunicação:** API REST entre frontend e backend.
- **Banco de dados:** PostgreSQL.
- **Autenticação:** interna, com e-mail, senha e sessão por cookie.
- **Hospedagem:** na máquina de desenvolvimento durante o MVP inicial. A hospedagem paga fica para uma fase posterior.

### Princípios da arquitetura

- Dados separados de apresentação, para facilitar a futura adição de equipes.
- Configurações fora do código, para facilitar a migração de hospedagem.
- Salvamento em segundo plano, para não interromper a edição.
- Um único conceito de "quadro" para o plano fixo e para as marcações da linha do tempo, evitando duplicação de dados.
- Desfazer e refazer mantidos em memória no navegador; apenas o estado salvo vai ao banco.

---

## 11. Modelo conceitual de dados

**Usuário:** id, e-mail, senha (hash), nome de exibição, papel (comum ou administrador), aceite do termo de uso (versão e data), data de criação, tentativas de login, bloqueado até (data e hora), status (ativo ou excluído).

**Jogador:** id, dono (usuário), nickname, avatar (iniciais), função principal, observações, data de criação.

**Função:** tabela de referência com a lista fixa (Entry Fragger, AWPer, Lurker, Support, IGL, Anchor), preparada para crescer.

**Função secundária do jogador:** jogador e função. A função secundária não pode ser igual à principal.

**Mapa:** id, nome (um dos sete do MVP), imagem PNG própria produzida pela equipe.

**Tipo de execução, condição econômica e objetivo tático:** tabelas de referência, com as listas fixas.

**Tática:** id, autor (usuário, podendo ficar vazio se a conta for excluída), mapa, nome, lado (T ou CT), visibilidade (privada ou pública), data de criação e data da última alteração.
- Classificação por tipo de execução, condição econômica e objetivo tático, em relação de muitos para muitos com as tabelas de referência.

**Sequência:** id, tática, nome, origem (do zero ou do plano).

**Quadro:** unidade que guarda um estado do campo. Serve ao plano fixo e às marcações da linha do tempo.
- id, tática, sequência (vazio no plano fixo), instante (vazio no plano fixo), tipo (manual ou automática).

**Posição de jogador no quadro:** quadro, jogador (vazio se o jogador foi removido da equipe), função (rótulo editável na tática), coordenadas normalizadas (de 0 a 1).

**Utilitário no quadro:** quadro, tipo (smoke, flash, molotov ou HE), posição de impacto em coordenadas normalizadas, trajetória (opcional), duração.

**Traço:** quadro, jogador, pontos em coordenadas normalizadas, status (rascunho ou confirmado).

**Denúncia:** id, tática, usuário denunciante, motivo, status. Combinação de tática e usuário é única.

**Derivados (não guardados):** número de jogadores (contado no plano fixo) e miniatura do cartão (gerada a partir do plano fixo).

**Observação sobre a equipe:** a estrutura já prevê o campo de dono em táticas, para que, numa fase posterior, seja possível compartilhar acesso sem reestruturar os dados.

---

## 12. Escopo do MVP

**Entra no lançamento:**

- Cadastro e login próprios, com bloqueio de tentativas e recuperação manual de senha.
- Gerenciamento de jogadores com função principal e secundárias.
- Editor sobre os sete mapas do MVP, com plano fixo, traços, utilitários e desfazer/refazer.
- Sequências animadas com linha do tempo, marcações e reprodução.
- Biblioteca por mapa, com busca e filtros.
- Publicação pública com nome de exibição do autor, denúncia, remoção e termo de uso.

**Fica para depois:**

- Prévia animada ao passar o mouse.
- Upload de avatar.
- Recuperação automática de senha.
- Lista completa de funções personalizadas.
- Controle de equipe e permissões.
- Versão para celular.
- Comunidade completa com comentários e perfis.
- Análise de partidas e integração com estatísticas.
- Login com Google.
- Nomes de posições no mapa.
- Mapas além dos sete do MVP.

---

## 13. Critérios de aceitação

**Cadastro e login**
- Usuário cria conta com e-mail e senha, faz login e logout.
- Após cinco tentativas erradas, a conta fica bloqueada por alguns minutos.
- A recuperação de senha é feita manualmente, sem erro de acesso.

**Jogadores**
- Usuário cadastra jogador com nickname, avatar com iniciais, função principal e secundárias.
- Os jogadores aparecem na lateral do editor e podem ser arrastados para o mapa.
- Ao remover um jogador, as táticas são mantidas e a posição fica com a função, sem jogador.

**Editor de táticas**
- Usuário escolhe um dos sete mapas e posiciona jogadores arrastando do elenco.
- Usuário desenha um caminho em modo próprio e confirma com "definir caminho".
- Usuário adiciona utilitários com posição de impacto e, opcionalmente, trajetória.
- Desfazer e refazer funcionam para todas as ações, e um arraste completo é uma única ação.
- Arrastar e desenhar têm resposta imediata, sem atraso perceptível.
- As posições reaparecem no mesmo lugar em qualquer tamanho de tela.
- O mapa PNG é exibido com nitidez aceitável em tela de alta densidade (verificado na T4.1).

**Linha do tempo e sequências**
- Usuário cria sequências do zero e adiciona marcações manuais ou automáticas.
- Botões de tocar, pausar e voltar funcionam, e a velocidade pode ser ajustada.
- Smokes e molotovs mostram a duração na linha do tempo, com o tempo padrão do tipo.
- Entre duas marcações, jogadores e utilitários se movem de forma linear.

**Biblioteca**
- Táticas são organizadas por mapa e filtradas por lado, execução, economia, objetivo e quantidade de jogadores.
- Uma tática pode ser filtrada por mais de uma opção em cada categoria.
- Cada cartão mostra nome, mapa, lado, filtros, número de jogadores, data da última alteração e miniatura do plano fixo.

**Publicação e denúncia**
- Usuário publica uma tática na biblioteca pública, com o nome de exibição do autor visível.
- Qualquer usuário pode denunciar uma tática uma única vez, e o administrador consegue removê-la.
- Após denunciar, a tática não aparece mais para quem denunciou.
- Ao excluir a conta, as táticas privadas são removidas e as públicas continuam com autor "usuário desconhecido".

**Termos e mapas**
- O termo de uso contém os pontos exigidos em RF23, incluindo o canal de contato.
- Os sete mapas do MVP são imagens próprias da equipe, sem imagens originais como fundo (RNF13).

**Segurança**
- Senhas nunca são guardadas em texto puro.
- Usuário só edita as próprias táticas e jogadores.
- Dados enviados ao servidor são validados antes de serem salvos.

---

## 14. Riscos e pontos de atenção

| Risco | Impacto | Tratamento |
|---|---|---|
| Direitos sobre os mapas e nomes | Alto | Mapas produzidos a partir de descrições, termo de uso com os pontos de RF23, link oficial da política da Valve registrado no Anexo C e revisão jurídica antes da publicação pública. |
| Semelhança dos mapas gerados por IA com os originais | Alto | Comparação consciente com o original antes da publicação pública, verificando semelhança de layout e não de expressão visual. Revisão jurídica sobre titularidade de imagens geradas por IA. |
| Complexidade da linha do tempo | Alto | Implementar marcações e interpolação de forma incremental, com testes desde o início. |
| Escopo do MVP crescer | Alto | Manter a lista de pós-MVP visível e revisar a cada etapa. |
| Nitidez dos mapas PNG em telas de alta densidade | Médio | Teste na T4.1. Se necessário, regenerar os mapas em maior resolução. |
| Moderação de conteúdo público | Médio | Denúncia, ocultação para quem denunciou, remoção e termo de uso desde o lançamento. |
| Segurança dos dados pessoais | Médio | Hash de senhas, backups, validação no servidor e revisão de aderência à LGPD antes da publicação pública. |
| Desempenho do editor | Médio | Konva para renderização, salvamento em segundo plano e testes com muitos elementos. |
| Migração da hospedagem | Médio | Configurações separadas do código e banco portável (PostgreSQL). |
| Confusão entre arrastar e desenhar | Médio | Modo de desenho separado, confirmado com "definir caminho". |
| Inspiração visual confundida com cópia | Baixo a médio | Evitar logotipos e marcas, e revisar a aparência antes da publicação pública. |
| Cadastro ou login sem proteção suficiente | Alto | Limite de tentativas, hash de senhas e sessão com expiração. |

---

## 15. Plano sugerido de desenvolvimento

Ordem de construção, do mais fundamental ao mais complexo:

1. **Base do projeto:** estrutura do frontend e do backend, banco PostgreSQL e configuração de ambiente local.
2. **Cadastro e login:** contas, senhas com hash, sessão, bloqueio de tentativas e termo de uso.
3. **Jogadores:** cadastro, funções principais e secundárias, avatar com iniciais, remoção sem perda de táticas.
4. **Editor com plano fixo:** mapa PNG, coordenadas normalizadas, arrastar jogadores, sugestão de funções, desfazer e refazer.
5. **Utilitários e desenho de caminho:** barra de ferramentas, posição de impacto, trajetória opcional e modo de desenho.
6. **Linha do tempo:** sequências, marcações, interpolação linear, reprodução e velocidade.
7. **Biblioteca:** organização por mapa, cartões, busca e filtros.
8. **Publicação, denúncia e administração:** publicação pública, denúncia, ocultação por usuário e remoção.
9. **Revisão final:** testes dos critérios de aceitação, revisão de segurança, aderência à LGPD e revisão jurídica dos mapas.
10. **Hospedagem:** publicação quando houver decisão sobre orçamento.

**Trilha paralela concluída:** produção dos sete mapas em PNG.

---

## Anexo A — Decisões aprovadas

- Função do jogador: uma principal e quantas secundárias quiser.
- Funções como sugestão, com liberdade total para trocar na tática.
- Sugestão automática das funções a partir da função principal, apenas em posições vazias.
- A posição na tática guarda o jogador cadastrado e a função; se o jogador sair da equipe, a posição fica com a função e sem jogador.
- Lista completa de funções para depois.
- Controle de equipe para depois, com base de dados pronta desde o MVP.
- Campo "status na equipe" removido do MVP.
- Desenhar caminho: modo próprio, confirmado com "definir caminho".
- Traço não confirmado (rascunho) é salvo no banco.
- Utilitários: smoke, flash, molotov e HE, com trajetória opcional e duração na linha do tempo, com duração padrão igual à do jogo.
- Sequências: linha do tempo com marcações manuais ou automáticas, criadas do zero ou a partir do plano.
- Interpolação linear entre marcações.
- Barra de utilitários no topo do editor; linha do tempo na parte inferior.
- Cada tática: plano fixo e uma ou mais sequências animadas.
- Biblioteca organizada por mapa, com filtros de lado, execução, economia, objetivo e quantidade de jogadores.
- Uma tática pode ter mais de um tipo de execução, de condição econômica e de objetivo tático.
- Lista fixa de estilos de jogo do MVP: a de RF18 (Rush, Split, Exec, Fake, Default e Contact).
- Quantidade de jogadores calculada automaticamente.
- Cartão de tática com miniatura do plano fixo no MVP.
- Desktop primeiro, celular depois.
- Editor com Konva, mapa, elenco e utilitários.
- Login interno, com e-mail e senha. Login com Google fica para depois.
- Recuperação de senha manual.
- Limite simples de tentativas de login.
- Banco PostgreSQL, backend Python com FastAPI, frontend React com TypeScript, Tailwind CSS e API REST.
- Hospedagem na máquina de desenvolvimento por enquanto.
- Publicação pública no MVP, com denúncia, remoção, nome de exibição do autor e termo de uso.
- Denúncia única por usuário e tática; a tática fica oculta apenas para quem denunciou.
- Conta excluída: táticas privadas são removidas; táticas públicas permanecem com autor "usuário desconhecido".
- Administrador é um papel do usuário, definido manualmente no banco no MVP.
- Tema escuro, inspirado no CS2 sem cópia de marca.
- Paleta aprovada (seção 9).
- Coordenadas normalizadas (de 0 a 1) para todas as posições.
- Arraste com eventos de ponteiro; desfazer por ação completa.
- Salvamento em segundo plano, com atraso de cerca de 1,5 segundo após a última alteração e ao sair da tática.
- Mapas do MVP: Ancient, Nuke, Mirage, Inferno, Dust II, Cache e Anubis.
- Mapas produzidos pela equipe por IA a partir de descrições, sem imagens originais como fundo ou referência; a Valve mantém os direitos sobre mapas e nomes.
- Mapas em PNG, e não em vetor (alteração registrada no RNF13).
- Canal de contato do titular dos dados: contato.cspect@gmail.com.
- Termos de uso com independência, ausência de vínculo ou endosso da Valve e uso dos nomes para identificação.
- Nomes de posições no mapa ficam para o pós-MVP.
- Revisão jurídica e revisão de LGPD antes da publicação pública, não antes do desenvolvimento.

## Anexo B — Pendências em aberto

- Confirmar no jogo a duração do smoke (18 ou 20 segundos), já que as fontes divergem.
- Resolução mínima dos PNGs dos mapas, a definir após o teste de nitidez na T4.1.
- Texto final do termo de uso (versão 0.1 redigida, em revisão).
- Verificação de aderência à LGPD antes da publicação pública.
- Revisão jurídica dos mapas antes da publicação pública, incluindo a titularidade de imagens geradas por IA e a comparação de semelhança com os originais.
- Escolha da biblioteca de interface na fase de implementação, quando necessário.
- Definição da hospedagem e do orçamento mensal.
- Custo e detalhes do login com Google, a ser tratado na fase pós-MVP.

## Anexo C — Fontes e referências

- Política oficial de uso de imagens de mapas da Valve: verificada pelo usuário. Link oficial: [inserir link].
- Fontes consultadas para a duração dos utilitários: csdb.gg (Grenades & Utility Guide) e scope.gg (The Ultimate Grenades Guide in CS2). Divergência registrada no Anexo B.
