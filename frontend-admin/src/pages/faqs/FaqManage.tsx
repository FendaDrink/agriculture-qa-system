import { useMemo, useState } from 'react'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import AdminEmptyState from '../../components/AdminEmptyState'
import {
  createManualFaq,
  deleteManualFaq,
  getHighFrequencyFaqs,
  getManualFaqs,
  overrideHighFrequencyFaq,
  updateManualFaq,
  type FaqListItem,
  type ManualFaqItem,
} from '../../api/faqs'

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
]

const FaqManage: React.FC = () => {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [createOpen, setCreateOpen] = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ManualFaqItem | null>(null)
  const [selectedHighItem, setSelectedHighItem] = useState<FaqListItem | null>(null)

  const [createForm] = Form.useForm()
  const [promoteForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const params = useMemo(() => ({ page, pageSize, keyword: keyword || undefined, status }), [page, pageSize, keyword, status])

  const { data: manualData, isLoading } = useQuery({
    queryKey: ['manual-faqs', params],
    queryFn: () => getManualFaqs(params),
  })

  const { data: manualLookupData } = useQuery({
    queryKey: ['manual-faqs-lookup'],
    queryFn: () => getManualFaqs({ page: 1, pageSize: 500 }),
  })

  const { data: highData, isLoading: highLoading } = useQuery({
    queryKey: ['high-faqs'],
    queryFn: () => getHighFrequencyFaqs(20),
  })

  const createMutation = useMutation({
    mutationFn: createManualFaq,
    onSuccess: () => {
      message.success('新增成功')
      setCreateOpen(false)
      setPromoteOpen(false)
      setSelectedHighItem(null)
      createForm.resetFields()
      promoteForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['manual-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['manual-faqs-lookup'] })
      queryClient.invalidateQueries({ queryKey: ['high-faqs'] })
    },
    onError: (err: any) => message.error(err?.message || '新增失败'),
  })

  const updateMutation = useMutation({
    mutationFn: updateManualFaq,
    onSuccess: () => {
      message.success('更新成功')
      setEditOpen(false)
      setSelectedItem(null)
      editForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['manual-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['manual-faqs-lookup'] })
    },
    onError: (err: any) => message.error(err?.message || '更新失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteManualFaq,
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['manual-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['manual-faqs-lookup'] })
    },
    onError: (err: any) => message.error(err?.message || '删除失败'),
  })

  const overrideMutation = useMutation({
    mutationFn: overrideHighFrequencyFaq,
    onSuccess: () => {
      message.success('已保存')
      setPromoteOpen(false)
      setSelectedHighItem(null)
      promoteForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['manual-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['manual-faqs-lookup'] })
      queryClient.invalidateQueries({ queryKey: ['high-faqs'] })
    },
    onError: (err: any) => message.error(err?.message || '保存失败'),
  })

  const manualColumns = [
    {
      title: '问题内容',
      dataIndex: 'question',
      key: 'question',
    },
    {
      title: '覆盖来源',
      dataIndex: 'originQuestion',
      key: 'originQuestion',
      width: 220,
      render: (value?: string | null) => value ? <Tag color="blue">覆盖自动高频</Tag> : <span className="muted">手动新增</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (value: number) => value === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sortNo',
      key: 'sortNo',
      width: 90,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      render: (_: unknown, record: ManualFaqItem) => (
        <Space>
          <Button
            onClick={() => {
              setSelectedItem(record)
              editForm.setFieldsValue({
                question: record.question,
                status: record.status,
                sortNo: record.sortNo,
              })
              setEditOpen(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除这条问题？"
            description="删除后该手动维护问题将不再展示。"
            overlayClassName="admin-danger-popconfirm"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const highColumns = [
    {
      title: '高频问题',
      dataIndex: 'question',
      key: 'question',
    },
    {
      title: '出现次数',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 110,
    },
    {
      title: '最近提问时间',
      dataIndex: 'latestAskedAt',
      key: 'latestAskedAt',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '启用状态',
      key: 'overrideStatus',
      width: 110,
      render: (_: unknown, record: FaqListItem) => {
        const override = (manualLookupData?.items || []).find((item) => item.originQuestion === record.question)
        if (!override) return <span className="muted">未设置</span>
        return override.status === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>
      },
    },
    {
      title: '排序',
      key: 'overrideSortNo',
      width: 90,
      render: (_: unknown, record: FaqListItem) => {
        const override = (manualLookupData?.items || []).find((item) => item.originQuestion === record.question)
        if (!override) return <span className="muted">-</span>
        return override.sortNo
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: unknown, record: FaqListItem) => (
        <Space>
          <Button
            onClick={() => {
              const override = (manualLookupData?.items || []).find((item) => item.originQuestion === record.question)
              setSelectedHighItem(record)
              promoteForm.setFieldsValue({
                question: override?.question || record.question,
                status: override?.status ?? 1,
                sortNo: override?.sortNo ?? 0,
              })
              setPromoteOpen(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除这条高频问题展示？"
            description="删除后将撤销当前高频问题的展示配置。"
            overlayClassName="admin-danger-popconfirm"
            onConfirm={() => overrideMutation.mutate({
              originQuestion: record.question,
              question: record.question,
              status: 0,
              sortNo: 0,
            })}
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="常见问题管理"
        subtitle="自动高频问题来自真实提问；可手动维护问题用于前台优先展示"
        extra={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['manual-faqs'] })
                queryClient.invalidateQueries({ queryKey: ['manual-faqs-lookup'] })
                queryClient.invalidateQueries({ queryKey: ['high-faqs'] })
              }}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新增手动问题
            </Button>
          </Space>
        }
      />

      <div className="admin-toolbar-panel">
        <Space wrap style={{ marginBottom: 0 }}>
        <Input.Search
          allowClear
          placeholder="搜索问题内容"
          style={{ width: 260 }}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            setPage(1)
          }}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 140 }}
          options={statusOptions}
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        />
        </Space>
        <div className="admin-toolbar-meta">
          <span className="admin-summary-chip">手动问题 {manualData?.total || 0} 条</span>
          <span className="admin-summary-chip subtle">自动高频 {highData?.items?.length || 0} 条</span>
        </div>
      </div>

      <Typography.Title level={5} style={{ marginTop: 8 }}>手动维护问题</Typography.Title>
      <Table
        className="admin-table"
        rowKey="id"
        loading={isLoading}
        dataSource={manualData?.items || []}
        columns={manualColumns}
        rowClassName={(record) => (Number(record.status) === 0 ? 'admin-row-disabled' : record.originQuestion ? 'admin-row-info' : '')}
        locale={{
          emptyText: (
            <AdminEmptyState
              title="暂无手动问题"
              description="当前还没有手动维护的问题，新增后可优先在前台展示。"
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize,
          total: manualData?.total || 0,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage)
            setPageSize(nextPageSize)
          },
        }}
      />

      <Typography.Title level={5} style={{ marginTop: 18 }}>自动高频问题</Typography.Title>
      <Table
        className="admin-table"
        rowKey="id"
        loading={highLoading}
        dataSource={highData?.items || []}
        columns={highColumns}
        rowClassName={() => 'admin-row-soft'}
        locale={{
          emptyText: (
            <AdminEmptyState
              title="暂无自动高频问题"
              description="系统会根据真实提问情况生成高频问题列表。"
            />
          ),
        }}
        pagination={false}
      />

      <Modal
        title="编辑自动高频问题"
        open={promoteOpen}
        onCancel={() => {
          setPromoteOpen(false)
          setSelectedHighItem(null)
        }}
        onOk={() => promoteForm.submit()}
        okButtonProps={{ loading: overrideMutation.isPending }}
      >
        <Form
          form={promoteForm}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedHighItem) return
            overrideMutation.mutate({
              ...values,
              originQuestion: selectedHighItem.question,
            })
          }}
        >
          <Form.Item label="原始高频问题">
            <Input.TextArea value={selectedHighItem?.question || ''} rows={3} disabled />
          </Form.Item>
          <Form.Item
            label="修改后问题"
            name="question"
            rules={[{ required: true, message: '请输入问题' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="排序（越大越靠前）" name="sortNo">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增手动问题"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        okButtonProps={{ loading: createMutation.isPending }}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ status: 1, sortNo: 0 }}
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            label="问题"
            name="question"
            rules={[{ required: true, message: '请输入问题' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="排序（越大越靠前）" name="sortNo">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑手动问题"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          setSelectedItem(null)
        }}
        onOk={() => editForm.submit()}
        okButtonProps={{ loading: updateMutation.isPending }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedItem) return
            updateMutation.mutate({ id: selectedItem.id, ...values })
          }}
        >
          <Form.Item
            label="问题"
            name="question"
            rules={[{ required: true, message: '请输入问题' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="排序（越大越靠前）" name="sortNo">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FaqManage
