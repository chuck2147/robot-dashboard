import { h } from 'preact'
import { useNTValue } from './nt'

interface Props {
  ntKey: string
}
export const SendableChooser = ({ ntKey }: Props) => {
  const [options] = useNTValue<string[]>(`${ntKey}/options`)
  const [selected, setSelected] = useNTValue<string>(`${ntKey}/selected`)
  const [defaultValue] = useNTValue<string>(`${ntKey}/default`)

  return (
    // eslint-disable-next-line caleb/jsx-a11y/no-onchange
    <select
      onChange={e => setSelected(e.currentTarget.value)}
      value={selected || defaultValue}
      // Disabled if options doesn't exist
      disabled={!options}
    >
      {options?.map(optName => (
        <option value={optName} key={optName}>
          {optName}
        </option>
      ))}
    </select>
  )
}
