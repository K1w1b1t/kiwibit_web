# Design Examples — Kiwibit

Esta pasta contém apenas os arquivos necessários para extrair o design do projeto.

O que foi mantido:

- `app/` — páginas e rotas (Next.js App Router)
- `components/` — componentes reutilizáveis usados pelo design
- `public/` — imagens e ativos estáticos
- `tailwind.config.js` e `postcss.config.cjs` — configuração de estilos
- `tsconfig.json` e `package.json` — metadados mínimos do projeto

Como usar:

1. Copie as pastas `app`, `components` e `public` para o seu novo projeto.
2. Traga `tailwind.config.js` e `postcss.config.cjs` se for usar Tailwind.
3. Atualize `package.json` no seu novo projeto com dependências necessárias.

Observações:

- Esta pasta foi limpa para ficar enxuta — arquivos de infraestrutura, testes, configurações de CI/CD, integrações e dados foram removidos.
- Se precisar de algo específico que foi removido, me avise que eu recupero o arquivo.

---

Arquivo limpo gerado automaticamente para facilitar início de novo projeto.

## Alterações realizadas aqui

- Renomeei subpastas `app` internamente para nomes que não começam com `app` (ex.: `app` → `app_examples` → `app_disabled` → `disabled`) para evitar que o Next.js detecte e tente compilar um App Router dentro de `docs/`.
- Atualizei o `tsconfig.json` do repositório principal para ignorar esta pasta durante a checagem TypeScript (`exclude: ["docs/design_examples_disabled"]`).
- Rodei `npm run build` e a build do projeto principal concluiu com sucesso após essas mudanças.

## Como reativar os exemplos

- Para reabilitar estes exemplos localmente, reverta as renomeações (restaurando os nomes originais `app`) e remova a exclusão em `tsconfig.json`.
- Instale dependências necessárias para os exemplos (ex.: `framer-motion`, `lucide-react`) antes de rodar o build.

Se quiser, eu posso commitar as renomeações como um commit separado ou mover os exemplos para um diretório de arquivamento (`.archive/`), diga qual prefere.
