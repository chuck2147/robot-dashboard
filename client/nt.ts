import { useState, useEffect } from 'preact/hooks'

type NTPrimitive = string | number | boolean | undefined
type NTValue = NTPrimitive | NTPrimitive[]

type Listener<T extends NTValue> = (value: T) => void

const listeners: { [key: string]: Listener<NTValue>[] } = {}
const ntCache: { [key: string]: NTValue } = {}

const subscribe = <T extends NTValue>(key: string, listener: Listener<T>) => {
  listeners[key] = (listeners[key] || []).concat(listener as Listener<NTValue>)
  const existingValue = ntCache[key]
  if (existingValue !== undefined) {
    listener(existingValue as T)
  }
  return listener
}

const unsubscribe = <T extends NTValue>(key: string, listener: Listener<T>) => {
  listeners[key] = (listeners[key] || []).filter(l => l !== listener)
}

declare global {
  interface Window {
    receiveNTValue: (key: string, value: NTValue) => void
    sendNTValue: (key: string, value: NTValue) => void
    ntCache: typeof ntCache
    flushNT: () => void
    connect: (address?: string) => Promise<void>
  }
}

const flushNT = () => {
  Object.values(listeners).forEach(valListeners => {
    valListeners.forEach(listener => listener(undefined))
  })
}

window.flushNT = flushNT
window.ntCache = ntCache

window.receiveNTValue = (key: string, value: NTValue) => {
  ntCache[key] = value
  const matchingListeners = listeners[key] || []
  matchingListeners.forEach(l => l(value))
}

type UnLiteral<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T

export const connect = window.connect

export const useNTValue = <T extends NTValue>(key: string, def?: T) => {
  const [value, setValue] = useState<T | undefined>(def)

  useEffect(() => {
    const listener = subscribe<T>(key, value => {
      setValue(value)
    })
    return () => unsubscribe(key, listener)
  }, [key])

  const setNewValue = (value: T) => {
    window.sendNTValue(key, value)
    ntCache[key] = value
    setValue(value)
  }

  return [value, setNewValue] as const
}

export const useLivePoint = (key: string) => {
  const [x] = useNTValue<number>(`${key}/x`)
  const [y] = useNTValue<number>(`${key}/y`)
  const [angle] = useNTValue<number>(`${key}/angle`)
  return x !== undefined && y !== undefined && angle !== undefined
    ? { x, y, angle }
    : null
}
