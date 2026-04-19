module.exports = [
  {
    files: ['src/**/*.js', 'server.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {},
  },
];
