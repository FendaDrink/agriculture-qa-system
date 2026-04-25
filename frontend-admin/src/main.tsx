import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'antd/dist/reset.css'
import './styles/global.css'
import { AuthProvider } from './contexts/AuthContext'
import AppRoutes from './routes/AppRoutes'

dayjs.locale('zh-cn')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1c7a4b',
          colorSuccess: '#248b58',
          colorWarning: '#c9891f',
          colorError: '#bf4f3f',
          colorInfo: '#2f7c62',
          borderRadius: 16,
          borderRadiusLG: 22,
          borderRadiusSM: 12,
          boxShadow: '0 18px 36px rgba(15, 68, 43, 0.10)',
          boxShadowSecondary: '0 14px 28px rgba(15, 68, 43, 0.08)',
          colorBgLayout: '#edf4ef',
          colorBgContainer: 'rgba(255, 255, 255, 0.82)',
          colorBorder: 'rgba(21, 100, 66, 0.12)',
          fontFamily:
            '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Layout: {
            siderBg: 'rgba(255, 255, 255, 0.86)',
            headerBg: 'rgba(255, 255, 255, 0.78)',
            bodyBg: '#edf4ef',
          },
          Menu: {
            itemBorderRadius: 14,
            itemMarginBlock: 6,
            itemMarginInline: 10,
            itemSelectedBg: 'rgba(32, 126, 78, 0.12)',
            itemSelectedColor: '#166645',
            itemColor: '#476556',
            itemHoverColor: '#166645',
          },
          Card: {
            borderRadiusLG: 22,
          },
          Table: {
            borderColor: 'rgba(18, 97, 63, 0.10)',
            headerBg: 'rgba(241, 247, 243, 0.95)',
            headerColor: '#234332',
            rowHoverBg: 'rgba(24, 118, 75, 0.05)',
          },
          Button: {
            borderRadius: 999,
            controlHeight: 40,
          },
          Input: {
            borderRadius: 14,
            activeBorderColor: '#1c7a4b',
            hoverBorderColor: '#1c7a4b',
          },
          Select: {
            borderRadius: 14,
            controlHeight: 40,
          },
          Modal: {
            borderRadiusLG: 24,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>,
)
