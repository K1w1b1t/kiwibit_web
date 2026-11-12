# Evidências da revisão do LinkedIn

Capturas feitas no navegador em um ambiente local descartável, com artigo fictício e destino da empresa simulado. Nenhuma publicação foi enviada ao LinkedIn.

1. `01-rascunho.png`: formulário com o artigo em rascunho.
2. `02-modal-texto-hashtags.png`: modal aberto após publicar o artigo no blog, com capa, texto, hashtags e prévia.
3. `03-modal-confirmacao.png`: texto e hashtags editados, com a confirmação habilitada.

O teste `tests/e2e/linkedin-review-browser.test.ts` também verifica que Escape fecha o modal, mantém o artigo publicado e não registra entregas ao LinkedIn.
