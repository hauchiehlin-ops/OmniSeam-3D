import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
// Fonts are bundled locally (no Google Fonts CDN) so the app works fully offline.
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './index.css'
import './i18n'
import { initNativeShell } from './platform/native'

initNativeShell()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
