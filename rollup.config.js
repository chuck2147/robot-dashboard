import babel from 'rollup-plugin-babel'
import node from '@rollup/plugin-node-resolve'
import url from '@rollup/plugin-url'
import linaria from 'linaria-preact/rollup'
import css from 'rollup-plugin-css-only'

const extensions = ['.js', '.ts', '.tsx']

export default {
  input: {
    'client/index': 'client/index.tsx',
    'server/index': 'server/index.ts',
  },
  external: ['carlo', 'wpilib-nt-client', 'conf'],
  plugins: [
    node({ extensions }),
    linaria({ sourceMap: false }),
    babel({ extensions }),
    url({
      fileName: '/client/[hash][extname]',
      publicPath: '/dist',
    }),
    css({ output: 'dist/client/bundle.css' }),
  ],
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
  },
}
