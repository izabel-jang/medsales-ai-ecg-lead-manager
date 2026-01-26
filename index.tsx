import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// GAS 환경에서 에러 디버깅용
window.onerror = function(msg, url, lineNo, columnNo, error) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 20px; font-family: monospace; color: red;">
        <h2>JavaScript Error</h2>
        <p><strong>Message:</strong> ${msg}</p>
        <p><strong>URL:</strong> ${url}</p>
        <p><strong>Line:</strong> ${lineNo}, Column: ${columnNo}</p>
        <p><strong>Stack:</strong></p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error?.stack || 'N/A'}</pre>
      </div>
    `;
  }
  return false;
};

// DOM이 준비될 때까지 기다림 (GAS 환경 호환)
function initApp() {
  const container = document.getElementById('root');
  
  if (!container) {
    // root가 없으면 에러 표시
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: monospace; color: red;">
        <h2>Mount Error</h2>
        <p>root element not found!</p>
        <p>document.readyState: ${document.readyState}</p>
        <p>body children: ${document.body?.children?.length || 0}</p>
      </div>
    `;
    return;
  }
  
  // 로딩 표시 (디버그용)
  container.innerHTML = '<div style="padding:20px;">Loading React...</div>';
  
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e: any) {
    container.innerHTML = `
      <div style="padding: 20px; font-family: monospace; color: red;">
        <h2>React Error</h2>
        <p>${e?.message || e}</p>
        <pre>${e?.stack || ''}</pre>
      </div>
    `;
  }
}

// DOM 준비 상태에 따라 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM이 이미 준비됨
  initApp();
}
