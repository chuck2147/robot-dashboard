module.exports = api => {
  const isTest = api.env('test')

  return {
    plugins: [
      ['babel-plugin-const-enum', { transform: 'constObject' }],
      ['@babel/plugin-transform-react-jsx', { pragma: 'h' }],
      ['@babel/plugin-proposal-optional-chaining', { loose: true }],
    ],
    presets: [
      ['linaria-preact/babel', { evaluate: true }],
      ['@babel/preset-typescript', { jsxPragma: 'h' }],
      isTest && [
        '@babel/preset-env',
        {
          targets: {
            node: 'current',
          },
        },
      ],
    ].filter(Boolean),
  }
}
