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
      <Space direction="vertical" size={4}>
        {breadcrumb && breadcrumb.length > 0 ? <Breadcrumb items={breadcrumbItems} /> : null}
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle ? <Typography.Text className="muted">{subtitle}</Typography.Text> : null}
      </Space>
      {extra ? <div>{extra}</div> : null}
    </div>
  )
}

export default PageHeader
