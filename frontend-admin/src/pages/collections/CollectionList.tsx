import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Typography, message } from 'antd'
import { EnvironmentOutlined, FolderOpenOutlined, PlusOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons'
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
import PageHeader from '../../components/PageHeader'
import AdminEmptyState from '../../components/AdminEmptyState'
import { CITY_OPTIONS, getCityLabel } from '../../constants/city'

const CollectionList: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CollectionDto | null>(null)
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState<number | undefined>(undefined)
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

  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    const list = normalized
      ? data.filter((item) => {
          return (
            item.collectionName.toLowerCase().includes(normalized) ||
            item.id.toLowerCase().includes(normalized) ||
            item.createBy.toLowerCase().includes(normalized) ||
            getCityLabel(item.city).toLowerCase().includes(normalized)
          )
        })
      : data
    const byCity = city === undefined ? list : list.filter((item) => Number(item.city) === city)
    return [...byCity].sort((a, b) => dayjs(b.updateTime).valueOf() - dayjs(a.updateTime).valueOf())
  }, [data, keyword, city])

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
    form.setFieldsValue({ collectionName: collection.collectionName, city: collection.city })
    setModalOpen(true)
  }

  const handleSubmit = (values: { collectionName: string; city?: number }) => {
    if (!user) return
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        collectionName: values.collectionName,
        createBy: editing.createBy,
        city: user.roleId === 0 ? values.city : Number(editing.city ?? user.city ?? 0),
      })
      return
    }
    createMutation.mutate({
      collectionName: values.collectionName,
      createBy: user.userId,
      city: user.roleId === 0 ? values.city : Number(user.city ?? 0),
    })
  }

  return (
    <div>
      <PageHeader
        title="向量库管理"
        subtitle={isAdmin ? '查看全部向量库' : '仅展示你创建的向量库'}
        extra={
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索名称 / ID / 创建人 / 城市"
              style={{ width: 260 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              allowClear
              placeholder="城市"
              style={{ width: 170 }}
              options={CITY_OPTIONS}
              value={city}
              onChange={(v) => setCity(v)}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['collections'] })}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建向量库
            </Button>
          </Space>
        }
      />

      <div className="admin-toolbar-panel">
        <div className="admin-toolbar-meta">
          <span className="admin-summary-chip">当前共 {filtered.length} 个向量库</span>
          {city !== undefined ? <span className="admin-summary-chip subtle">已按城市筛选</span> : null}
          {keyword ? <span className="admin-summary-chip subtle">已按关键词检索</span> : null}
        </div>
      </div>

      <div className="card-grid">
        {filtered.map((collection) => (
          <Card
            key={collection.id}
            className="collection-card"
            title={collection.collectionName}
            extra={<span className="muted">{collection.id.slice(0, 6)}</span>}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div className="collection-card-meta">
                <span className="collection-meta-pill">
                  <UserOutlined />
                  {collection.username || collection.createBy}
                </span>
                <span className="collection-meta-pill subtle">
                  <EnvironmentOutlined />
                  {getCityLabel(collection.city)}
                </span>
              </div>
              <Typography.Text className="muted">
                更新时间：{dayjs(collection.updateTime).format('YYYY-MM-DD HH:mm')}
              </Typography.Text>
              <Space wrap>
                <Button type="primary" icon={<FolderOpenOutlined />} onClick={() => navigate(`/collections/${collection.id}/documents`, {
                  state: { collectionName: collection.collectionName },
                })}>
                  进入
                </Button>
                <Button onClick={() => openEdit(collection)}>编辑</Button>
                <Popconfirm
                  title="确认删除该向量库？"
                  description="删除后将无法恢复"
                  overlayClassName="admin-danger-popconfirm"
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
        className="admin-form-modal"
        title={editing ? '编辑向量库' : '新建向量库'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ city: Number(user?.city ?? 0) }}
          onFinish={handleSubmit}
        >
          <Form.Item
            label="向量库名称"
            name="collectionName"
            rules={[{ required: true, message: '请输入向量库名称' }]}
          >
            <Input placeholder="例如：玉米病害知识库" />
          </Form.Item>
          <Form.Item
            label="所属城市"
            name="city"
            rules={[{ required: true, message: '请选择所属城市' }]}
          >
            <Select options={CITY_OPTIONS} disabled={user?.roleId !== 0} placeholder="请选择城市" />
          </Form.Item>
        </Form>
      </Modal>

      {!isLoading && filtered.length === 0 && (
        <AdminEmptyState
          title="暂无向量库"
          description="当前没有符合条件的向量库记录，可以先新建一个向量库。"
        />
      )}
    </div>
  )
}

export default CollectionList
