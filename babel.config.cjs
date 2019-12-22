module.exports = {
  plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h' }]],
  presets: [
    ['linaria-preact/babel', { evaluate: true }],
    ['@babel/preset-typescript', { jsxPragma: 'h' }],
  ],
}
