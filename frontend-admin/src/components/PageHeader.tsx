import { Breadcrumb, Space, Typography } from 'antd'

interface PageHeaderProps {
  title: string
  subtitle?: string
  extra?: React.ReactNode
  breadcrumb?: { title: string; onClick?: () => void }[]
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, extra, breadcrumb }) => {
  const breadcrumbItems = (breadcrumb || []).map((item, index, arr) => {
    const isLast = index === arr.length - 1
    const clickable = !!item.onClick || !isLast
    return {
      title: clickable ? (
        <span
          style={{ cursor: 'pointer', color: '#1f7a3e' }}
          onClick={() => (item.onClick ? item.onClick() : window.history.back())}
        >
          {item.title}
        </span>
      ) : (
        item.title
      ),
    }
  })

  return (
    <div className="page-header">
      <Space direction="vertical" size={6} className="page-header-copy">
        <Typography.Text className="page-header-kicker">
          {breadcrumb && breadcrumb.length > 0 ? breadcrumb[0].title : '后台管理'}
        </Typography.Text>
        {breadcrumb && breadcrumb.length > 0 ? <Breadcrumb className="page-header-breadcrumb" items={breadcrumbItems} /> : null}
        <Typography.Title level={4} style={{ margin: 0 }} className="page-header-title">
          {title}
        </Typography.Title>
        {subtitle ? <Typography.Text className="muted">{subtitle}</Typography.Text> : null}
      </Space>
      {extra ? <div className="page-header-extra">{extra}</div> : null}
    </div>
  )
}

export default PageHeader
