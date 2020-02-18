import { useState, useEffect } from 'preact/hooks'

declare global {
  interface Window {
    saveConfValue: (
      key: string,
      value: string | number | boolean | undefined,
    ) => void
    readConfValue: (
      key: string,
    ) => Promise<string | number | boolean | undefined>
  }
}

export const useConfState = <T extends number | string | boolean | undefined>(
  key: string,
  initialValue: T,
) => {
  const [val, setVal] = useState<T | undefined>(undefined)
  useEffect(() => {
    window.readConfValue(key).then(savedVal => {
      if (savedVal === undefined) setVal(initialValue)
      else setVal(savedVal as any)
    })
  }, [initialValue, key])

  useEffect(() => {
    window.saveConfValue(key, val)
  }, [key, val])

  return [val, setVal] as const
}
