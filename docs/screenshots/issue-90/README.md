# Issue 90 — Editor Markdown e prévia

Capturas obtidas em banco efêmero com contas fictícias e consentimento de analytics recusado. Desktop: 1440 × 1000; mobile: 390 × 844. As imagens mostram a janela do navegador na posição relevante para cada estado.

A prévia e o blog público usam o mesmo parser Markdown e a mesma sanitização no servidor. Os testes no navegador criaram e publicaram um post, conferiram a preservação do Markdown e abriram a versão pública em português e o fallback em inglês. As imagens `edit-existing-html`, `preview-existing-html` e `edit-legacy` verificam compatibilidade com posts anteriores.

Os estados de erro de prévia, envio, upload em andamento e respostas de upload foram simulados na fronteira HTTP para capturas reproduzíveis. O fluxo real de criação e publicação usou a API e o banco efêmero. O indicador de desenvolvimento do Next.js foi ocultado nas capturas.

| Tela / estado         | Desktop                                  | Mobile                                  |
| --------------------- | ---------------------------------------- | --------------------------------------- |
| create-empty          | [Ver](create-empty-desktop.png)          | [Ver](create-empty-mobile.png)          |
| create-server-error   | [Ver](create-server-error-desktop.png)   | [Ver](create-server-error-mobile.png)   |
| create-submitting     | [Ver](create-submitting-desktop.png)     | [Ver](create-submitting-mobile.png)     |
| create-success        | [Ver](create-success-desktop.png)        | [Ver](create-success-mobile.png)        |
| edit-english          | [Ver](edit-english-desktop.png)          | [Ver](edit-english-mobile.png)          |
| edit-existing-html    | [Ver](edit-existing-html-desktop.png)    | [Ver](edit-existing-html-mobile.png)    |
| edit-legacy           | [Ver](edit-legacy-desktop.png)           | [Ver](edit-legacy-mobile.png)           |
| edit-markdown         | [Ver](edit-markdown-desktop.png)         | [Ver](edit-markdown-mobile.png)         |
| emoji-no-results      | [Ver](emoji-no-results-desktop.png)      | [Ver](emoji-no-results-mobile.png)      |
| emoji-picker          | [Ver](emoji-picker-desktop.png)          | [Ver](emoji-picker-mobile.png)          |
| image-empty           | [Ver](image-empty-desktop.png)           | [Ver](image-empty-mobile.png)           |
| image-inserted        | [Ver](image-inserted-desktop.png)        | [Ver](image-inserted-mobile.png)        |
| image-invalid         | [Ver](image-invalid-desktop.png)         | [Ver](image-invalid-mobile.png)         |
| image-network-error   | [Ver](image-network-error-desktop.png)   | [Ver](image-network-error-mobile.png)   |
| image-storage-error   | [Ver](image-storage-error-desktop.png)   | [Ver](image-storage-error-mobile.png)   |
| image-upload-success  | [Ver](image-upload-success-desktop.png)  | [Ver](image-upload-success-mobile.png)  |
| image-uploading       | [Ver](image-uploading-desktop.png)       | [Ver](image-uploading-mobile.png)       |
| image-url             | [Ver](image-url-desktop.png)             | [Ver](image-url-mobile.png)             |
| member-own-draft      | [Ver](member-own-draft-desktop.png)      | [Ver](member-own-draft-mobile.png)      |
| member-save-success   | [Ver](member-save-success-desktop.png)   | [Ver](member-save-success-mobile.png)   |
| preview-english       | [Ver](preview-english-desktop.png)       | [Ver](preview-english-mobile.png)       |
| preview-error         | [Ver](preview-error-desktop.png)         | [Ver](preview-error-mobile.png)         |
| preview-existing-html | [Ver](preview-existing-html-desktop.png) | [Ver](preview-existing-html-mobile.png) |
| preview-markdown      | [Ver](preview-markdown-desktop.png)      | [Ver](preview-markdown-mobile.png)      |
| public-en-fallback    | [Ver](public-en-fallback-desktop.png)    | [Ver](public-en-fallback-mobile.png)    |
| public-pt             | [Ver](public-pt-desktop.png)             | [Ver](public-pt-mobile.png)             |
| validation            | [Ver](validation-desktop.png)            | [Ver](validation-mobile.png)            |
