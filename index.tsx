
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 這是應用程式的進入點
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("找不到 root 節點，請檢查 index.html 是否包含 <div id='root'></div>");
}
