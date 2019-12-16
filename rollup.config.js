import babel from 'rollup-plugin-babel'

export default {
  input: {
    'client/index': 'client/index.ts',
    'server/index': 'server/index.ts',
  },
  external: ['carlo'],
  plugins: [
    babel({
      extensions: ['.js', '.ts'],
      presets: ['@babel/preset-typescript'],
    }),
  ],
  output: {
    dir: 'dist',
    format: 'esm',
  },
}
