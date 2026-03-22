import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, List, Modal, Popconfirm, Space, Typography, message } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { addChunk, deleteChunk, getChunks, updateChunk } from '../../api/chunks'
import type { ChunkDetailDto } from '../../types/api'
import { useAuth } from '../../hooks/useAuth'

interface LocationState {
  collectionName?: string
  documentName?: string
}

const ChunkList: React.FC = () => {
  const { collectionId, documentId } = useParams()
  const { state } = useLocation() as { state: LocationState }
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<ChunkDetailDto | null>(null)
  const [form] = Form.useForm()

  const safeCollectionId = collectionId || ''
  const safeDocumentId = documentId || ''

  const queryKey = useMemo(() => ['chunks', safeDocumentId], [safeDocumentId])

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getChunks(safeDocumentId),
    enabled: !!safeDocumentId,
  })

  const addMutation = useMutation({
    mutationFn: addChunk,
    onSuccess: () => {
      message.success('分段已新增')
      queryClient.invalidateQueries({ queryKey })
      setEditOpen(false)
      setEditing(null)
      form.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '新增失败'),
  })

  const updateMutation = useMutation({
    mutationFn: updateChunk,
    onSuccess: () => {
      message.success('分段已更新')
      queryClient.invalidateQueries({ queryKey })
      setEditOpen(false)
      setEditing(null)
      form.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '更新失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteChunk,
    onSuccess: () => {
      message.success('分段已删除')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: any) => message.error(error?.message || '删除失败'),
  })

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    setEditOpen(true)
  }

  const openEdit = (chunk: ChunkDetailDto) => {
    setEditing(chunk)
    form.setFieldsValue({ content: chunk.content })
    setEditOpen(true)
  }

  const handleSubmit = (values: { content: string }) => {
    if (!user || !safeCollectionId || !safeDocumentId) return
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        content: values.content,
        collectionId: safeCollectionId,
        documentId: safeDocumentId,
        user: user.userId,
      })
      return
    }
    addMutation.mutate({
      content: values.content,
      collectionId: safeCollectionId,
      documentId: safeDocumentId,
      user: user.userId,
    })
  }

  return (
    <div>
      <div className="list-toolbar">
        <Space direction="vertical" size={4}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/collections/${safeCollectionId}/documents`, {
              state: { collectionName: state?.collectionName },
            })}>
              返回文件列表
            </Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              分段管理
            </Typography.Title>
          </Space>
          <Typography.Text className="muted">
            {state?.documentName ? `${state.documentName} · 分段列表` : '管理该文件的分段内容'}
          </Typography.Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          新增分段
        </Button>
      </div>

      <List
        loading={isLoading}
        grid={{ gutter: 16, column: 2 }}
        dataSource={data}
        locale={{ emptyText: '暂无分段' }}
        renderItem={(item) => (
          <List.Item>
            <Card
              size="small"
              hoverable
              className="chunk-card"
              onClick={() => openEdit(item)}
              title={<span className="muted">{item.id.slice(0, 8)}</span>}
              extra={
                <Popconfirm
                  title="确认删除该分段？"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    deleteMutation.mutate({
                      id: item.id,
                      collectionId: safeCollectionId,
                      documentId: safeDocumentId,
                    })
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              }
            >
              <Typography.Paragraph ellipsis={{ rows: 4 }} style={{ marginBottom: 8 }}>
                {item.content}
              </Typography.Paragraph>
              <Typography.Text className="muted">
                更新时间：{dayjs(item.updateTime).format('YYYY-MM-DD HH:mm')}
              </Typography.Text>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        open={editOpen}
        title={editing ? '编辑分段' : '新增分段'}
        onCancel={() => {
          setEditOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        okButtonProps={{ loading: addMutation.isPending || updateMutation.isPending }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="分段内容"
            name="content"
            rules={[{ required: true, message: '请输入分段内容' }]}
          >
            <Input.TextArea rows={6} placeholder="请输入分段内容" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ChunkList
