import babel from 'rollup-plugin-babel'
import node from '@rollup/plugin-node-resolve'

const extensions = ['.js', '.ts']

export default {
  input: {
    'client/index': 'client/index.ts',
    'server/index': 'server/index.ts',
  },
  external: ['carlo'],
  plugins: [
    node({ extensions }),
    babel({
      extensions,
      presets: ['@babel/preset-typescript'],
    }),
  ],
  output: {
    dir: 'dist',
    format: 'esm',
  },
}
