import { Layout, Menu, Button, Dropdown, Typography, Space, Tag } from 'antd'
import {
  AppstoreOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
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
        icon: <span className="menu-icon-badge"><DatabaseOutlined /></span>,
        label: '向量库管理',
      },
      {
        key: '/recall',
        icon: <span className="menu-icon-badge"><SearchOutlined /></span>,
        label: '召回',
      },
    ]

    if (user && (user.roleId === 0 || user.roleId === 1)) {
      base.push({
        key: '/users',
        icon: <span className="menu-icon-badge"><TeamOutlined /></span>,
        label: '用户管理',
      })
      base.push({
        key: '/logs',
        icon: <span className="menu-icon-badge"><FileSearchOutlined /></span>,
        label: '日志审计',
      })
      base.push({
        key: '/faqs',
        icon: <span className="menu-icon-badge"><QuestionCircleOutlined /></span>,
        label: '常见问题',
      })
    }

    return base
  }, [user])

  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key

  const currentLabel = menuItems.find((item) => item.key === selectedKey)?.label
  const currentIcon = selectedKey === '/collections'
    ? <FolderOpenOutlined />
    : selectedKey === '/recall'
      ? <SearchOutlined />
      : selectedKey === '/users'
        ? <TeamOutlined />
        : selectedKey === '/logs'
          ? <FileSearchOutlined />
          : selectedKey === '/faqs'
            ? <QuestionCircleOutlined />
            : <AppstoreOutlined />
  const roleText = user?.roleId === 0 ? '超级管理员' : user?.roleId === 1 ? '管理员' : '普通用户'

  const profileMenu = {
    items: [
      {
        key: 'role',
        icon: <UserOutlined />,
        label: `角色：${roleText}`,
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
    <Layout className="admin-layout">
      <Sider
        width={220}
        theme="light"
        collapsible
        collapsed={collapsed}
        trigger={null}
        className="admin-sider"
      >
        <div className={`brand-block ${collapsed ? 'collapsed' : ''}`}>
          <div className="brand-mark">
            <AppstoreOutlined />
          </div>
          {!collapsed ? (
            <div className="brand-copy">
              <Typography.Text className="brand-kicker">农业知识问答助手</Typography.Text>
              <Typography.Text className="brand-title">后台管理中心</Typography.Text>
            </div>
          ) : null}
        </div>
        <Menu
          className="admin-menu"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={menuItems}
          onClick={(info) => navigate(info.key)}
        />
      </Sider>
      <Layout className="admin-main">
        <Header className="admin-header">
          <Space size={12}>
            <Button
              type="text"
              className="header-toggle-btn"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
            />
            <Space size={10} direction="vertical" className="header-title-group">
              <Space size={10} className="header-title-row">
                <Typography.Text className="header-title">
                  {typeof currentLabel === 'string' ? currentLabel : '控制台'}
                </Typography.Text>
              </Space>
            </Space>
          </Space>
          <Space size={10}>
            <Tag bordered={false} color="green" className="role-tag">
              {roleText}
            </Tag>
            <Dropdown menu={profileMenu} placement="bottomRight">
              <Button type="text" className="profile-trigger">{user?.username || user?.userId}</Button>
            </Dropdown>
          </Space>
        </Header>
        <Content className="page-shell">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
