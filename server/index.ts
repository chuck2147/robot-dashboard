import carlo from 'carlo'

const main = async () => {
  const app = await carlo.launch()
  app.on('exit', () => process.exit())
  app.serveFolder(process.cwd())
  await app.load('index.html')
}

main()
