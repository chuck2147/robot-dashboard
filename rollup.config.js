import babel from 'rollup-plugin-babel'
import node from '@rollup/plugin-node-resolve'
import url from '@rollup/plugin-url'
import linaria from 'linaria-preact/rollup'
import css from 'rollup-plugin-css-only'

const extensions = ['.js', '.ts', '.tsx']

const opts = {
  external: ['carlo', 'wpilib-nt-client', 'conf', 'util', 'fs', 'path'],
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
}

export default [
  {
    ...opts,
    input: { 'client/index': 'client/index.tsx' },
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: true,
    },
  },
  {
    ...opts,
    input: { 'server/index': 'server/index.ts' },
    output: {
      dir: 'dist',
      format: 'cjs',
      sourcemap: false,
    },
  },
]
