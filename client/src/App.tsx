import { Layout, Tabs, Typography } from 'antd'
import { PledgePage } from './pages/PledgePage'
import { RedemptionPage } from './pages/RedemptionPage'

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          Ломбард
        </Typography.Title>
      </Layout.Header>
      <Layout.Content style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: 24 }}>
        <Tabs
          defaultActiveKey="pledge"
          items={[
            { key: 'pledge', label: 'Новый залог', children: <PledgePage /> },
            { key: 'redemption', label: 'Выкуп залога', children: <RedemptionPage /> },
          ]}
        />
      </Layout.Content>
    </Layout>
  )
}

export default App
