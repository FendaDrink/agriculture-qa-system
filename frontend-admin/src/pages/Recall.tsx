import { useMemo } from 'react'
import { Button, Card, Form, Input, List, Select, Space, Typography, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getCollections, searchCollections } from '../api/collections'
import { recallChunks } from '../api/recall'
import { useAuth } from '../hooks/useAuth'

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
      <div className="list-toolbar">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            召回
          </Typography.Title>
          <Typography.Text className="muted">选择知识库并召回最匹配的分段</Typography.Text>
        </div>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            recallMutation.mutate({
              collectionId: values.collectionId,
              query: values.query,
              topN: 10,
            })
          }
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

      <List
        loading={recallMutation.isPending}
        grid={{ gutter: 16, column: 2 }}
        dataSource={items}
        locale={{ emptyText: recallMutation.isSuccess ? '没有召回结果' : '请先发起召回' }}
        renderItem={(item, index) => (
          <List.Item>
            <Card
              className="chunk-card"
              title={`#${index + 1} · ${item.id.slice(0, 8)}`}
              extra={
                item.score !== undefined ? (
                  <Typography.Text className="muted">匹配度: {item.score.toFixed(4)}</Typography.Text>
                ) : null
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
