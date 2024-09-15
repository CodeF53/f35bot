import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    // won't be seen by users, log so we can fix it
    'no-console': 'off',
    // single line guard statements
    'antfu/if-newline': 'off',
    // dumb logic, sometimes you KNOW it will not be undefined
    'ts/no-non-null-asserted-optional-chain': 'off',
    // ha yes use redundant `require('thing')` instead of just using `thing`
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/console': 'off',
    'node/prefer-global/process': 'off',
    'node/prefer-global/text-decoder': 'off',
    'node/prefer-global/text-encoder': 'off',
    'node/prefer-global/url-search-params': 'off',
    'node/prefer-global/url': 'off',

    // no dumb extra line on else
    'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'brace-style': 'off',
    // import cleaning
    'unused-imports/no-unused-imports': 'error',
    'import/consistent-type-specifier-style': 'error',
  },

  /** @type { import('@antfu/eslint-config').Rules } */
  settings: {
    'import/extensions': ['.js', '.ts'],
    'import/consistent-type-specifier-style': 'prefer-top-level',
    'style/comma-dangle': 'always',
    'style/arrow-parens': 'as-needed',
    'jsonc/comma-dangle': 'only-multiline',
  },
})
