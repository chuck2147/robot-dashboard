import { h, render } from 'preact'
import { PathEditor } from './path-editor'
import { css } from 'linaria'
import { backgroundColor } from '../config'

export const globals = css`
  :global() {
    *,
    *:before,
    *:after {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: ${backgroundColor};
      color: white;
    }
  }
`

const root = document.querySelector('#root')
if (root)
  render(
    <div>
      <PathEditor />
    </div>,
    root,
  )
