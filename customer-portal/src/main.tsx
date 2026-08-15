import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (err: any) {
  console.error('React bootstrap failed:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding:2rem;font-family:monospace;color:#ef4444;background:#fff5f5;border:1px solid #ef4444;border-radius:8px;margin:2rem;max-width:800px;">
        <h2 style="margin:0 0 1rem 0;">⚠️ React Bootstrap Error</h2>
        <pre style="white-space:pre-wrap;word-break:break-all;font-size:14px;">${err?.message || err}</pre>
        <pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;margin-top:1rem;color:#71717a;">${err?.stack || ''}</pre>
      </div>
    `;
  }
}
