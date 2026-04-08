module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Torna o escopo (número da issue) obrigatório
    'scope-empty': [2, 'never'],
    // Garante que o tipo seja um dos padrões (feat, fix, etc)
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'test', 'perf'],
    ],
    // Opcional: garantir que o assunto não termine com ponto final
    'subject-full-stop': [2, 'never', '.'],
  },
};
