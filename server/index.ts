/* eslint-disable caleb/unicorn/no-process-exit */
/* eslint-disable no-process-exit */

import carlo from 'carlo'
import wpilibNtClient from 'wpilib-nt-client'
import Conf from 'conf'
import { promisify } from 'util'
import { writeFile, readFile } from 'fs'
import { join } from 'path'

const writeFileAsync = promisify(writeFile)
const readFileAsync = promisify(readFile)

const config = new Conf({ projectName: 'robot-dashboard' })

const nt = new wpilibNtClient.Client()

const killNT = () => {
  if (!nt.isConnected()) return
  nt.stop()
  nt.destroy()
}

type NTPrimitive = string | number | boolean | undefined
type NTValue = NTPrimitive | NTPrimitive[]

declare global {
  interface Window {
    receiveNTValue: (key: string, value: NTValue) => void
    flushNT: () => void
  }
}

const main = async () => {
  const app = await carlo.launch()
  app.on('exit', () => {
    killNT()
    process.exit()
  })
  app.serveFolder(process.cwd())

  let lastAddress: string | undefined
  let wasConnectedLastCheck = false

  const onDisconnect = () => {
    console.log('Disconnected from', lastAddress)
    app.evaluate(() => window.flushNT())
  }

  // auto-reconnect
  setInterval(() => {
    const isConnected = nt.isConnected()
    if (!isConnected) {
      if (wasConnectedLastCheck) {
        onDisconnect()
      }
      connect()
    }
    wasConnectedLastCheck = isConnected
  }, 200)

  const sendValue = (key: string, value: NTValue) => {
    if (key.startsWith('/Usage')) return
    app.evaluate(
      (key, value) => window.receiveNTValue(key, value),
      key,
      value as any,
    )
  }

  const connect = (address = lastAddress) =>
    new Promise<void>(resolve => {
      killNT()
      nt.start((_, err) => {
        lastAddress = address
        if (err !== null) return
        console.log('Connected to', address)
        Object.values(nt.getEntries()).forEach(entry => {
          sendValue(entry.name, entry.val)
        })
        resolve()
      }, address)
    })

  await app.exposeFunction('connect', (address?: string) => connect(address))
  await app.exposeFunction('sendNTValue', (key, value) => {
    nt.Assign(value, key as string)
  })
  nt.addListener((key, val) => {
    sendValue(key, val)
  })

  await app.exposeFunction(
    'saveConfValue',
    (key: string, value: string | number | boolean) => {
      config.set(key, value)
    },
  )
  await app.exposeFunction('readConfValue', (key: string) => config.get(key))
  await app.exposeFunction(
    'savePaths',
    (folderPath: string, trajectories: string, paths: string) => {
      Promise.all([
        writeFileAsync(join(folderPath, 'paths.json'), paths),
        writeFileAsync(join(folderPath, 'trajectories.json'), trajectories),
      ])
    },
  )
  await app.exposeFunction('readPaths', (folderPath: string) =>
    readFileAsync(join(folderPath, 'paths.json'), 'utf8').catch(() => '{}'),
  )

  await app.load('index.html')
  await connect('localhost')
}

main().catch(error => console.error(error))
