import { Typography } from 'antd'

interface AdminEmptyStateProps {
  title?: string
  description?: string
}

const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  title = '暂无数据',
  description = '当前条件下没有可展示的内容，请调整筛选条件或稍后再试。',
}) => {
  return (
    <div className="admin-empty-state">
      <Typography.Text className="admin-empty-title">{title}</Typography.Text>
      <Typography.Paragraph className="admin-empty-desc">
        {description}
      </Typography.Paragraph>
    </div>
  )
}

export default AdminEmptyState
