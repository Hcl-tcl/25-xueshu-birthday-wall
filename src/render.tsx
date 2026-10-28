import fs from 'fs/promises'
import { renderToStaticMarkup } from 'react-dom/server'
import { Page } from './Page'
import './index.css'

await fs.writeFile(
  './public/index.html',
  renderToStaticMarkup(<Page />)
)
