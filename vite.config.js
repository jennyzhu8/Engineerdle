import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { renderPath } from './lib/site.js'

// Serves the server-rendered content pages (lib/site.js) from `vite` and
// `vite preview`, mirroring the vercel.json rewrites to api/site.js.
const contentPages = () => {
  const middleware = (req, res, next) => {
    const page = renderPath(new URL(req.url, 'http://x').pathname)
    if (!page) return next()
    res.statusCode = page.status
    res.setHeader('Content-Type', page.type)
    res.end(page.body)
  }
  return {
    name: 'content-pages',
    configureServer: (server) => { server.middlewares.use(middleware) },
    configurePreviewServer: (server) => { server.middlewares.use(middleware) },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentPages()],
})
