import { useMemo } from 'react'
import { Button, Card, Form, Input, InputNumber, List, Select, Space, Typography, message } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getCollections, searchCollections } from '../api/collections'
import { recallChunks } from '../api/recall'
import { useAuth } from '../hooks/useAuth'
import AdminEmptyState from '../components/AdminEmptyState'
import CopyButton from '../components/CopyButton'
import PageHeader from '../components/PageHeader'

const Recall: React.FC = () => {
  const { user } = useAuth()
  const [form] = Form.useForm()

  const isAdmin = useMemo(() => user?.roleId === 0 || user?.roleId === 1, [user])

  const { data: collections = [] } = useQuery({
    queryKey: ['recall-collections', user?.roleId, user?.userId],
    queryFn: () => {
      if (!user) return Promise.resolve([])
      if (isAdmin) return getCollections()
      return searchCollections({ createBy: user.userId })
    },
    enabled: !!user,
  })

  const recallMutation = useMutation({
    mutationFn: recallChunks,
    onError: (error: any) => message.error(error?.message || '召回失败'),
  })

  const collectionOptions = collections.map((item) => ({
    value: item.id,
    label: `${item.collectionName}（${item.createBy}）`,
  }))

  const items = recallMutation.data?.items ?? []

  return (
    <div>
      <PageHeader
        title="召回"
        subtitle="选择知识库并召回最匹配的分段"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              recallMutation.reset()
              form.resetFields()
            }}
          >
            重置页面
          </Button>
        }
      />

      <Card style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            recallMutation.mutate({
              collectionId: values.collectionId,
              query: values.query,
              topN: values.topN,
            })
          }
          initialValues={{ topN: 10 }}
        >
          <Form.Item
            label="知识库"
            name="collectionId"
            rules={[{ required: true, message: '请选择知识库' }]}
          >
            <Select
              placeholder="请选择知识库"
              options={collectionOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label="问题"
            name="query"
            rules={[{ required: true, message: '请输入问题' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入要召回的问题" />
          </Form.Item>
          <Form.Item label="召回数量" name="topN">
            <InputNumber min={1} max={50} style={{ width: 160 }} />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              htmlType="submit"
              loading={recallMutation.isPending}
            >
              召回分段
            </Button>
            <Button
              onClick={() => {
                form.resetFields()
              }}
            >
              重置
            </Button>
          </Space>
        </Form>
      </Card>

      <div className="admin-toolbar-panel">
        <div className="admin-toolbar-meta">
          <span className="admin-summary-chip">
            {recallMutation.isSuccess ? `共召回 ${items.length} 条结果` : '尚未发起召回'}
          </span>
          {recallMutation.isSuccess && items.length > 0 ? <span className="admin-summary-chip subtle">结果按匹配度排序</span> : null}
        </div>
      </div>

      <List
        className="fixed-card-list"
        loading={recallMutation.isPending}
        grid={{ gutter: [16, 16], xs: 1, sm: 1, md: 2, lg: 3, xl: 4, xxl: 5 }}
        dataSource={items}
        locale={{
          emptyText: recallMutation.isSuccess ? (
            <AdminEmptyState
              title="没有召回结果"
              description="当前问题在所选知识库中没有匹配分段，可尝试换一种表述或调整知识库。"
            />
          ) : (
            <AdminEmptyState
              title="请先发起召回"
              description="选择知识库并输入问题后，系统会在这里展示最匹配的分段结果。"
            />
          ),
        }}
        renderItem={(item, index) => (
          <List.Item>
            <Card
              className="chunk-card"
              title={`#${index + 1} · ${item.id.slice(0, 8)}`}
              extra={
                <Space size={8}>
                  {item.score !== undefined ? (
                    <Typography.Text className="muted">匹配度: {item.score.toFixed(4)}</Typography.Text>
                  ) : null}
                  {item.distance !== undefined ? (
                    <Typography.Text className="muted">距离: {item.distance.toFixed(4)}</Typography.Text>
                  ) : null}
                  <CopyButton text={item.content} label="" />
                </Space>
              }
            >
              <Typography.Paragraph ellipsis={{ rows: 5 }}>{item.content}</Typography.Paragraph>
            </Card>
          </List.Item>
        )}
      />
    </div>
  )
}

export default Recall
