import { Layout, Menu, Button, Dropdown, Typography, Space, Tag } from 'antd'
import {
  DatabaseOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const { Header, Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

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
      base.push({
        key: '/logs',
        icon: <FileSearchOutlined />,
        label: '日志审计',
      })
      base.push({
        key: '/faqs',
        icon: <QuestionCircleOutlined />,
        label: '常见问题',
      })
    }

    return base
  }, [user])

  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key

  const currentLabel = menuItems.find((item) => item.key === selectedKey)?.label

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
      <Sider
        width={220}
        theme="light"
        collapsible
        collapsed={collapsed}
        trigger={null}
        style={{ borderRight: '1px solid rgba(31, 122, 62, 0.08)' }}
      >
        <div
          style={{
            padding: collapsed ? '18px 10px' : '18px 16px',
            fontWeight: 800,
            color: '#1f7a3e',
            letterSpacing: 0.2,
          }}
        >
          {collapsed ? 'KB' : '知识库后台'}
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
            background: 'rgba(255, 255, 255, 0.86)',
            borderBottom: '1px solid rgba(31, 122, 62, 0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Space size={10}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
            />
            <Space size={8}>
              <Typography.Text style={{ fontWeight: 650 }}>
                {typeof currentLabel === 'string' ? currentLabel : '控制台'}
              </Typography.Text>
              <Tag bordered={false} color="green">
                {user?.roleId === 0 ? '超级管理员' : user?.roleId === 1 ? '管理员' : '普通用户'}
              </Tag>
            </Space>
          </Space>
          <Dropdown menu={profileMenu} placement="bottomRight">
            <Button type="text">{user?.username || user?.userId}</Button>
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
