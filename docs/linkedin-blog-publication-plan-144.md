# Issue #144 — Revisão e publicação no LinkedIn com capa

## Comportamento definido

- Publicar o blog primeiro e, após sucesso, abrir o modal do LinkedIn. Cancelar mantém o blog publicado e não envia ao LinkedIn.
- Exibir texto editável, hashtags, capa, prévia final e destinos existentes.
- Usar chamadas personalizadas em português e inglês quando fornecidas; caso contrário, gerar uma sugestão mais longa que priorize frases completas. A chamada em português termina com “Leia o post no meu blog:”.
- Iniciar hashtags com `#Kiwibit #CyberSecurity #OffensiveSecurity`. As edições valem somente para aquela publicação.
- Salvar chamadas opcionais em português e inglês no post, editáveis no painel e disponíveis para preenchimento no MCP ao criar um rascunho.
- Sem capa, informar “Esta publicação será enviada sem imagem” e permitir confirmar.
- Havendo capa, falhas ao baixar, converter ou enviar a imagem impedem o envio naquele destino. Nunca substituir silenciosamente por texto.
- Adicionar “Publicar no LinkedIn” no editor de posts publicados para retomar revisões canceladas ou com falha.

## Implementação

### Fluxo, modal e contratos

- Remover os disparos automáticos do LinkedIn das rotas de criação e atualização do blog. Salvar rascunhos ou editar posts publicados não dispara compartilhamento.
- Usar o post retornado pela API para abrir a revisão, preservando seu ID mesmo após criar um novo artigo. Manter `post_created` apenas no sucesso da criação.
- Estender o `ConfirmDialog` existente com conteúdo composto, variante de confirmação e associações acessíveis, preservando os usos de exclusão. Implementar a revisão em `features/admin/posts`, separando UI, composição e coordenação.
- Criar `/api/admin/posts/[id]/linkedin`:
  - `GET`: retornar revisão salva ou sugestão inicial, capa atual, destinos e resultados.
  - `PUT`: salvar texto e hashtags, com controle de versão e verificação da versão do post exibido.
  - `POST`: confirmar uma versão salva e enviar aos destinos pendentes elegíveis.
- Exigir `requireAdminSession()` e artigo publicado. Resolver autor, capa, URLs e destinos no servidor; não aceitar tokens, autor ou mídia arbitrária no corpo.
- Persistir as edições antes de confirmar ou fechar pelo botão/Escape. Se o salvamento falhar, manter os valores no modal e explicar o erro.
- Gerenciar foco inicial, Tab/Shift+Tab, Escape e retorno ao acionador. Associar erros aos campos e anunciar progresso/resultados com regiões de status.

### Texto e mídia

- Compartilhar a composição e validação entre cliente e servidor. Montar texto final como texto editado seguido das hashtags, separadas por linha em branco.
- Normalizar hashtags com `#`, remover duplicatas preservando a ordem e rejeitar entradas inválidas. Hashtags são opcionais.
- Manter inicialmente o orçamento conservador atual: até 3.000 caracteres no perfil e 1.500 na representação escapada da empresa. Mostrar contagem e destino limitante; não truncar conteúdo confirmado.
- Para o perfil, registrar e enviar a imagem via Assets API e referenciar o asset no payload UGC com categoria `IMAGE`. Preservar o endpoint e escopos existentes, conforme [Share on LinkedIn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin).
- Para a empresa, usar Images API com o proprietário correto e referenciar a imagem em `content.media.id` no Posts API, mantendo a versão `202610`. Manter o link do artigo no texto. Referência: [Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-10).
- Registrar a mídia separadamente para cada proprietário; não reutilizar URNs entre perfil e empresa.
- Reutilizar validação e identificação de imagens existentes. Declarar `sharp` como dependência direta para converter WebP/AVIF em JPEG, preservando JPEG/PNG válidos.
- Limitar download a 4 MiB, conferir bytes reais e dimensões, aplicar timeout e proteção contra SSRF em URLs e redirecionamentos. Rejeitar explicitamente imagens indisponíveis ou inválidas.
- Sem capa, manter o compartilhamento de artigo existente. Preservar o fluxo de anúncios de projetos.

### Persistência, consentimento e duplicidade

- Gerar migração Prisma para uma revisão por post e entregas únicas por post/destino. Guardar texto, hashtags, versão, snapshot confirmado, proprietário, etapa, status, URNs e códigos de erro sanitizados.
- Revalidar configuração da empresa e conexão, consentimento, escopo, expiração e identidade do autor imediatamente antes do envio. Preservar a desativação do autopost quando a conexão exigir reconexão.
- Adquirir cada entrega atomicamente no banco antes de qualquer chamada externa. Cliques repetidos, abas concorrentes e novas requisições retornam o estado existente.
- Processar destinos independentemente e persistir cada resultado. Uma nova tentativa envia apenas destinos com falha confirmada; sucesso nunca é reenviado.
- Congelar o snapshot durante o envio. Se houver alterações no artigo ou no destino desde a revisão, exigir atualização e nova confirmação.
- Diferenciar falha anterior à criação do post de resultado incerto após iniciar a chamada de publicação. Timeout ou interrupção nessa última etapa bloqueiam reenvio até conferência operacional; não prometer entrega única garantida pelo provedor.
- Não preencher histórico de sucesso para artigos antigos. Ao compartilhar um post anterior à funcionalidade, alertar que ele pode já existir no LinkedIn e exigir confirmação específica.

## Testes e aceite

- Seguir TDD para composição, limites com hashtags e escaping, payloads com/sem imagem, conversão e falhas nas etapas de mídia.
- Cobrir confirmação, cancelamento sem envio, persistência das edições, retomada, teclado e foco.
- Testar autorização, consentimento revogado, token expirado, destinos desabilitados, concorrência, sucesso parcial e timeout ambíguo.
- Validar migração e persistência em banco descartável; executar os gates locais: `npm run lint`, `npm run format`, `npm run build`, `npm run test` e `npm run test:e2e`. Cobrir integralmente o comportamento novo sem reduzir os limiares existentes.
- Antes do aceite, realizar publicação real controlada com confirmação no modal em cada destino habilitado. Conferir texto, hashtags, imagem, links e ausência de duplicação; registrar evidência sanitizada.

## Investigação e entrega

- Aplicar as instruções do `kiwibit_web`, respeitando FSD e alterações locais já existentes.
- Consultar logs da Vercel correlacionando artigo, horário, destino e resposta HTTP. A investigação histórica permanece pendente: o conector retornou nenhuma equipe e a CLI não está instalada.
- Registrar somente IDs internos, etapa, destino, duração, status e códigos permitidos; nunca tokens, texto publicado ou respostas brutas do provedor.
- Atualizar o playbook com o novo fluxo e as regras de retomada. Aplicar a migração antes do deploy; em rollback, manter as tabelas e bloquear o compartilhamento para não reativar envios automáticos sem revisão.
