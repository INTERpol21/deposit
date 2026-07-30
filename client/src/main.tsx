import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={ruRU}>
    <App />
  </ConfigProvider>,
)
