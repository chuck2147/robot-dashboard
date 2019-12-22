module.exports = {
  plugins: [
    ['@babel/plugin-transform-react-jsx', { pragma: 'h' }],
    ['@babel/plugin-proposal-optional-chaining', { loose: true }],
  ],
  presets: [
    ['linaria-preact/babel', { evaluate: true }],
    ['@babel/preset-typescript', { jsxPragma: 'h' }],
  ],
}
