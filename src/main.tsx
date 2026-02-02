import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 
      使用 HashRouter 來處理前端路由。
      這可以避免在 GitHub Pages 等靜態網站託管服務上重新整理頁面時出現 404 錯誤。
    */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
