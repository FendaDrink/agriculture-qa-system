import { Layout, Menu, Button, Dropdown, Typography } from 'antd'
import { DatabaseOutlined, LogoutOutlined, SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'

const { Header, Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = useMemo(() => {
    const base = [
      {
        key: '/collections',
        icon: <DatabaseOutlined />,
        label: '向量库管理',
      },
      {
        key: '/recall',
        icon: <SearchOutlined />,
        label: '召回',
      },
    ]

    if (user && (user.roleId === 0 || user.roleId === 1)) {
      base.push({
        key: '/users',
        icon: <TeamOutlined />,
        label: '用户管理',
      })
    }

    return base
  }, [user])

  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key

  const profileMenu = {
    items: [
      {
        key: 'role',
        icon: <UserOutlined />,
        label: `角色：${user?.roleId === 0 ? '超级管理员' : user?.roleId === 1 ? '管理员' : '普通用户'}`,
        disabled: true,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => {
          logout()
          navigate('/login')
        },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light">
        <div style={{ padding: '20px 16px', fontWeight: 700, color: '#1f7a3e' }}>
          知识库后台
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={menuItems}
          onClick={(info) => navigate(info.key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid rgba(31, 122, 62, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          <Typography.Text className="muted">面向农业知识库的管理与治理</Typography.Text>
          <Dropdown menu={profileMenu} placement="bottomRight">
            <Button type="text">
              {user?.username || user?.userId}
            </Button>
          </Dropdown>
        </Header>
        <Content className="page-shell">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
