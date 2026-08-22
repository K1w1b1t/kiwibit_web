# Aula 10: CSS, design e heuristicas

Laboratorio local e ficticio para estudar a camada visual de uma interface de login. O estilo usa a linguagem escura/terminal do projeto, mas nao copia marca, logo ou dominio real.

## Executar

Abra `pagina.html` diretamente no navegador. Nao publique esta pasta. Nenhum dado e enviado, exibido ou armazenado: o submit usa `preventDefault()` e apenas mostra um feedback local.

## Tecnicas demonstradas

- Seletores por tag, classe e id.
- Box model com `padding`, `border`, `border-radius`, `margin` e `box-shadow`.
- Flexbox no cartao e no formulario; grid no shell responsivo.
- Media query para viewport estreito.
- Labels associados, semantica HTML, contraste e foco amarelo visivel via teclado.
- Feedback de estado e mensagem de recuperacao local.

## Heuristicas observadas

1. **Visibilidade do estado:** o botao muda o feedback e a regiao `role=status` confirma a simulacao.
2. **Consistencia e padroes:** labels, campo de senha e acao primaria seguem convencoes reconheciveis.
3. **Prevencao de erros:** campos obrigatorios e tipos semanticos bloqueiam envio incompleto.
4. **Controle e liberdade:** o link de recuperacao e a ausencia de navegacao inesperada deixam a saida clara.
5. **Reconhecer em vez de lembrar:** placeholders e labels tornam cada campo autoexplicativo.
6. **Design minimalista:** a tela mostra apenas a acao principal e o contexto didatico.
7. **Recuperacao de erros:** o feedback e local, legivel e nao revela a senha.
8. **Ajuda:** o painel contextualiza as tecnicas demonstradas.

A aparencia pode gerar confianca legitima ou ser usada para uma isca. A defesa nao e confiar no visual: confira URL/dominio, gerenciador de senhas e 2FA. Este laboratorio e somente local e nao coleta credenciais.
