module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ['airbnb'],
  rules: {
    'linebreak-style': ['error', 'unix'],
    'arrow-parens': ['error', 'as-needed'],
    'no-param-reassign': ['error', { props: false }],
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    'no-use-before-define': ['error', { functions: false }],
    'max-len': [
      'error',
      100,
      2,
      {
        ignoreUrls: true,
        ignoreComments: true,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'no-shadow': [
      'error',
      {
        builtinGlobals: true,
        hoist: 'functions',
        allow: ['resolve', 'reject', 'err'],
      },
    ],
    'no-console': [
      'error',
      {
        allow: ['warn', 'trace', 'log', 'error'],
      },
    ],
    'consistent-return': 0,
    'key-spacing': [
      'error',
      {
        multiLine: { beforeColon: false, afterColon: true },
        align: { beforeColon: false, afterColon: true, on: 'colon', mode: 'strict' },
      },
    ],
  },
};
