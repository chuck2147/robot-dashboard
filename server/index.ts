/* eslint-disable caleb/unicorn/no-process-exit */
/* eslint-disable no-process-exit */

import * as puppeteer from 'puppeteer'
import wpilibNtClient from 'wpilib-nt-client'
import Conf from 'conf'
import { promisify } from 'util'
import { writeFile, readFile } from 'fs'
import * as path from 'path'
import getPort from 'get-port'
import sirv from 'sirv'
import polka from 'polka'

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
  const blankPage = encodeURIComponent(`<html style="background: black">`)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [`--app=data:text/html,${blankPage}`],
  })

  const port = await getPort({ port: 3000 })
  const fileServer = sirv(process.cwd())
  const server = polka()
    .use(fileServer)
    .listen(port, (err: Error) => {
      console.error('error thrown from internal http server:', err)
    })

  const page = (await browser.pages())[0]

  page.on('close', () => {
    killNT()
    process.exit()
  })

  let lastAddress: string | undefined
  let wasConnectedLastCheck = false

  const onDisconnect = () => {
    console.log('Disconnected from', lastAddress)
    page.evaluate(() => window.flushNT())
  }

  // auto-reconnect
  setInterval(() => {
    const isConnected = nt.isConnected()
    if (!isConnected) {
      if (wasConnectedLastCheck) {
        onDisconnect()
      }
      // connect()
    }
    wasConnectedLastCheck = isConnected
  }, 200)

  const sendValue = (key: string, value: NTValue) => {
    if (key.startsWith('/Usage')) return
    page.evaluate(
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
        if (err) {
          console.log('error connecting', err)
          nt.destroy()
        }
        if (err !== null) return
        console.log('Connected to', address)
        Object.values(nt.getEntries()).forEach(entry => {
          sendValue(entry.name, entry.val)
        })
        resolve()
      }, address)
    })

  await page.exposeFunction('connect', (address?: string) => connect(address))
  await page.exposeFunction('sendNTValue', (key, value) => {
    nt.Assign(value, key as string)
  })
  nt.addListener((key, val) => {
    sendValue(key, val)
  })

  await page.exposeFunction(
    'saveConfValue',
    (key: string, value: string | number | boolean) => {
      config.set(key, value)
    },
  )
  await page.exposeFunction('readConfValue', (key: string) => config.get(key))
  await page.exposeFunction(
    'savePaths',
    (folderPath: string, trajectories: string, paths: string) => {
      Promise.all([
        writeFileAsync(path.join(folderPath, 'paths.json'), paths),
        writeFileAsync(
          path.join(folderPath, 'trajectories.json'),
          trajectories,
        ),
      ])
    },
  )
  await page.exposeFunction('readPaths', (folderPath: string) =>
    readFileAsync(path.join(folderPath, 'paths.json'), 'utf8').catch(
      () => '{}',
    ),
  )

  await page.goto(`http://localhost:${port}`)
  await connect('localhost')
}

main().catch(error => console.error(error))
