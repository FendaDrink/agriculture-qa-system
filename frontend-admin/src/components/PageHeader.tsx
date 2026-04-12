import { Breadcrumb, Space, Typography } from 'antd'

interface PageHeaderProps {
  title: string
  subtitle?: string
  extra?: React.ReactNode
  breadcrumb?: { title: string }[]
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, extra, breadcrumb }) => {
  return (
    <div className="page-header">
      <Space direction="vertical" size={4}>
        {breadcrumb && breadcrumb.length > 0 ? <Breadcrumb items={breadcrumb} /> : null}
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

