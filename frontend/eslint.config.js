module.exports = [
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        Blob: 'readonly',
        URL: 'readonly',
        clearTimeout: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
    rules: {},
  },
];
