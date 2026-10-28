import esbuild from 'esbuild'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const args = process.argv.slice(2)
const serveMode = args.includes('--serve')
const clientDefines = {
  __SUPABASE_URL__: JSON.stringify (process.env.SUPABASE_URL ?? ''),
  __SUPABASE_ANON_KEY__: JSON.stringify (process.env.SUPABASE_ANON_KEY ?? '')
}

const renderContext = await esbuild.context({
  entryPoints: ['src/render.tsx'],
  outdir: 'build/',
  platform: 'node',
  format: 'esm',
  packages: 'external',
  supported: { nesting: false },
  bundle: true,
  sourcemap: serveMode,
  minify: true
})
const clientContext = await esbuild.context({
  entryPoints: { app: 'src/client.ts' },
  outdir: 'build-client/',
  platform: 'browser',
  format: 'iife',
  supported: { nesting: false },
  bundle: true,
  define: clientDefines,
  sourcemap: serveMode,
  minify: true
})

if (serveMode) {
  const { default: express } = await import('express')
  const app = express()
  app.get('/', async (_req, res) => {
    await renderContext.rebuild()
    // https://stackoverflow.com/a/75057660
    await import('../build/render.js?_=' + Math.random())
    res.sendFile(
      fileURLToPath(new URL('../public/index.html', import.meta.url))
    )
  })
  app.get('/index.css', async (_req, res) => {
    await renderContext.rebuild()
    res.sendFile(fileURLToPath(new URL('../build/render.css', import.meta.url)))
  })
  app.get('/app.js', async (_req, res) => {
    await clientContext.rebuild()
    res.sendFile(fileURLToPath(new URL('../build-client/app.js', import.meta.url)))
  })
  app.use('/assets', express.static('public/assets'))
  app.get('/manifest.webmanifest', (_req, res) => {
    res.sendFile(fileURLToPath(new URL('../public/manifest.webmanifest', import.meta.url)))
  })
  app.get('/render.css.map', async (_req, res) => {
    await renderContext.rebuild()
    res.sendFile(
      fileURLToPath(new URL('../build/render.css.map', import.meta.url))
    )
  })
  app.listen(8080)
  console.log(`http://localhost:8080/`)
} else {
  await renderContext.rebuild()
  await clientContext.rebuild()
  await renderContext.dispose()
  await clientContext.dispose()
  await fs.mkdir('public/', { recursive: true })
  // @ts-expect-error Module either doesn't exist or has no types
  await import('../build/render.js')
  await fs.copyFile('build/render.css', 'public/index.css')
  await fs.copyFile('build-client/app.js', 'public/app.js')
}
