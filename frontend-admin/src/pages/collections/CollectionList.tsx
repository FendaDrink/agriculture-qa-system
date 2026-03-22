import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Typography, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  createCollection,
  deleteCollection,
  getCollections,
  searchCollections,
  updateCollection,
} from '../../api/collections'
import type { CollectionDto } from '../../types/api'
import { useAuth } from '../../hooks/useAuth'

const CollectionList: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CollectionDto | null>(null)
  const [form] = Form.useForm()

  const isAdmin = useMemo(() => user?.roleId === 0 || user?.roleId === 1, [user])

  const { data = [], isLoading } = useQuery({
    queryKey: ['collections', user?.roleId, user?.userId],
    queryFn: () => {
      if (!user) return Promise.resolve([])
      if (isAdmin) return getCollections()
      return searchCollections({ createBy: user.userId })
    },
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      message.success('向量库创建成功')
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '创建失败'),
  })

  const updateMutation = useMutation({
    mutationFn: updateCollection,
    onSuccess: () => {
      message.success('向量库更新成功')
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '更新失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      message.success('向量库已删除')
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
    onError: (error: any) => message.error(error?.message || '删除失败'),
  })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (collection: CollectionDto) => {
    setEditing(collection)
    form.setFieldsValue({ collectionName: collection.collectionName })
    setModalOpen(true)
  }

  const handleSubmit = (values: { collectionName: string }) => {
    if (!user) return
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        collectionName: values.collectionName,
        createBy: editing.createBy,
      })
      return
    }
    createMutation.mutate({
      collectionName: values.collectionName,
      createBy: user.userId,
    })
  }

  return (
    <div>
      <div className="list-toolbar">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            向量库管理
          </Typography.Title>
          <Typography.Text className="muted">
            {isAdmin ? '查看全部向量库' : '仅展示你创建的向量库'}
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建向量库
        </Button>
      </div>

      <div className="card-grid">
        {data.map((collection) => (
          <Card
            key={collection.id}
            className="collection-card"
            title={collection.collectionName}
            extra={<span className="muted">{collection.id.slice(0, 6)}</span>}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Text>创建人：{collection.createBy}</Typography.Text>
              <Typography.Text className="muted">
                更新时间：{dayjs(collection.updateTime).format('YYYY-MM-DD HH:mm')}
              </Typography.Text>
              <Space wrap>
                <Button type="primary" onClick={() => navigate(`/collections/${collection.id}/documents`, {
                  state: { collectionName: collection.collectionName },
                })}>
                  进入
                </Button>
                <Button onClick={() => openEdit(collection)}>编辑</Button>
                <Popconfirm
                  title="确认删除该向量库？"
                  description="删除后将无法恢复"
                  onConfirm={() => deleteMutation.mutate(collection.id)}
                >
                  <Button danger>删除</Button>
                </Popconfirm>
              </Space>
            </Space>
          </Card>
        ))}
      </div>

      <Modal
        title={editing ? '编辑向量库' : '新建向量库'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="向量库名称"
            name="collectionName"
            rules={[{ required: true, message: '请输入向量库名称' }]}
          >
            <Input placeholder="例如：玉米病害知识库" />
          </Form.Item>
        </Form>
      </Modal>

      {!isLoading && data.length === 0 && (
        <Typography.Paragraph className="muted">暂无向量库，请先创建。</Typography.Paragraph>
      )}
    </div>
  )
}

export default CollectionList
