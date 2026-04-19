import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  Upload,
  message,
} from 'antd'
import { ArrowLeftOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { RcFile } from 'antd/es/upload'
import {
  deleteDocument,
  getDocumentsByCollection,
  previewDocumentChunks,
  updateDocument,
  uploadDocument,
  type ChunkPreviewResult,
} from '../../api/documents'
import type { DocumentDto } from '../../types/api'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/PageHeader'
import { fetchDocumentPdf } from '../../api/files'

interface LocationState {
  collectionName?: string
}

const chunkRuleOptions = [
  { label: '语义混合（推荐）', value: 'semantic_hybrid' },
  { label: '句子打包（问答友好）', value: 'sentence_pack' },
  { label: '标题结构（文档结构化）', value: 'title_structure' },
  { label: '固定窗口（稳定长度）', value: 'fixed_window' },
]

const DocumentList: React.FC = () => {
  const { collectionId } = useParams()
  const { state } = useLocation() as { state: LocationState }
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [renameOpen, setRenameOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentDto | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [chunkPreviewOpen, setChunkPreviewOpen] = useState(false)
  const [chunkPreviewLoading, setChunkPreviewLoading] = useState(false)
  const [chunkPreviewData, setChunkPreviewData] = useState<ChunkPreviewResult | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTitle, setPreviewTitle] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const previewUrlRef = useRef<string>('')
  const [form] = Form.useForm()
  const [uploadForm] = Form.useForm()

  const safeCollectionId = collectionId || ''

  const { data = [], isLoading } = useQuery({
    queryKey: ['documents', safeCollectionId],
    queryFn: () => getDocumentsByCollection(safeCollectionId),
    enabled: !!safeCollectionId,
  })

  const uploadMutation = useMutation({
    mutationFn: (payload: { file: File; fileName: string }) =>
      uploadDocument(
        {
          collectionId: safeCollectionId,
          user: user?.userId || '',
          fileName: payload.fileName,
          chunkRule: uploadForm.getFieldValue('chunkRule') || 'semantic_hybrid',
          chunkSize: Number(uploadForm.getFieldValue('chunkSize') || 500),
          chunkOverlap: Number(uploadForm.getFieldValue('chunkOverlap') || 100),
          minChunkSize: Number(uploadForm.getFieldValue('minChunkSize') || 80),
        },
        payload.file,
        {
          onUploadProgress: (evt) => {
            const total = (evt as any)?.total as number | undefined
            const loaded = (evt as any)?.loaded as number | undefined
            if (!total || !loaded) return
            setUploadPercent(Math.min(100, Math.round((loaded / total) * 100)))
          },
        },
      ),
    onSuccess: () => {
      message.success('文件上传成功')
      queryClient.invalidateQueries({ queryKey: ['documents', safeCollectionId] })
    },
    onError: (error: any) => message.error(error?.message || '上传失败'),
  })

  const previewChunkMutation = useMutation({
    mutationFn: (payload: { file: File; fileName: string; chunkRule: string; chunkSize: number; chunkOverlap: number; minChunkSize: number }) =>
      previewDocumentChunks(
        {
          collectionId: safeCollectionId,
          user: user?.userId || '',
          fileName: payload.fileName,
          chunkRule: payload.chunkRule as any,
          chunkSize: payload.chunkSize,
          chunkOverlap: payload.chunkOverlap,
          minChunkSize: payload.minChunkSize,
        },
        payload.file,
      ),
    onError: (error: any) => message.error(error?.message || '分段预览失败'),
  })

  const updateMutation = useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      message.success('文件已更新')
      queryClient.invalidateQueries({ queryKey: ['documents', safeCollectionId] })
      setRenameOpen(false)
      setSelectedDoc(null)
      form.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '更新失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      message.success('文件已删除')
      queryClient.invalidateQueries({ queryKey: ['documents', safeCollectionId] })
    },
    onError: (error: any) => message.error(error?.message || '删除失败'),
  })

  const filteredDocs = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    const list = normalized
      ? data.filter((item) => {
          return (
            item.fileName.toLowerCase().includes(normalized) ||
            item.createBy.toLowerCase().includes(normalized) ||
            item.id.toLowerCase().includes(normalized)
          )
        })
      : data
    return [...list].sort((a, b) => dayjs(b.updateTime).valueOf() - dayjs(a.updateTime).valueOf())
  }, [data, keyword])

  const openRename = useCallback((doc: DocumentDto) => {
    setSelectedDoc(doc)
    form.setFieldsValue({ fileName: doc.fileName })
    setRenameOpen(true)
  }, [form])

  const openPreview = useCallback(async (doc: DocumentDto) => {
    setPreviewTitle(doc.fileName || 'PDF 预览')
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const blob = await fetchDocumentPdf(doc.id)
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      previewUrlRef.current = url
      setPreviewUrl(url)
    } catch (error: any) {
      message.error(error?.message || '获取 PDF 失败')
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ''
      }
    }
  }, [])

  const handleBeforeUpload = (file: RcFile) => {
    if (!user) {
      message.error('请先登录')
      return false
    }
    if (!safeCollectionId) {
      message.error('请先选择向量库')
      return false
    }
    if (file.type !== 'application/pdf') {
      message.error('仅支持上传 PDF 文件')
      return false
    }
    setPendingFile(file)
    uploadForm.setFieldsValue({
      fileName: file.name,
      chunkRule: 'semantic_hybrid',
      chunkSize: 500,
      chunkOverlap: 100,
      minChunkSize: 80,
    })
    setUploadPercent(0)
    setUploadOpen(true)
    return false
  }

  const submitUpload = async (values: { fileName: string; chunkRule: string; chunkSize: number; chunkOverlap: number; minChunkSize: number }) => {
    if (!pendingFile) return
    try {
      await uploadMutation.mutateAsync({ file: pendingFile, fileName: values.fileName })
      setUploadOpen(false)
      setPendingFile(null)
      setUploadPercent(0)
      setChunkPreviewData(null)
      setChunkPreviewOpen(false)
      uploadForm.resetFields()
    } catch (error) {
      // error message handled by mutation
    }
  }

  const handlePreviewChunks = async () => {
    if (!pendingFile) {
      message.warning('请先选择文件')
      return
    }
    try {
      const values = await uploadForm.validateFields([
        'fileName',
        'chunkRule',
        'chunkSize',
        'chunkOverlap',
        'minChunkSize',
      ])
      setChunkPreviewLoading(true)
      const data = await previewChunkMutation.mutateAsync({
        file: pendingFile,
        fileName: values.fileName,
        chunkRule: values.chunkRule,
        chunkSize: Number(values.chunkSize),
        chunkOverlap: Number(values.chunkOverlap),
        minChunkSize: Number(values.minChunkSize),
      })
      setChunkPreviewData(data)
      setChunkPreviewOpen(true)
    } catch (error) {
      // ignore, errors surfaced by表单/接口
    } finally {
      setChunkPreviewLoading(false)
    }
  }

  const columns = useMemo(() => {
    const goChunkList = (record: DocumentDto) => {
      navigate(`/collections/${safeCollectionId}/documents/${record.id}/chunks`, {
        state: {
          collectionName: state?.collectionName,
          documentName: record.fileName,
        },
      })
    }

    return [
      {
        title: '文件名称',
        dataIndex: 'fileName',
        key: 'fileName',
        render: (text: string) => (
          <Space>
            <FileTextOutlined />
            <span>{text}</span>
          </Space>
        ),
      },
      {
        title: '创建人',
        dataIndex: 'createBy',
        key: 'createBy',
        width: 120,
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        key: 'updateTime',
        width: 180,
        render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 360,
        render: (_: unknown, record: DocumentDto) => (
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                openPreview(record)
              }}
            >
              预览
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                openRename(record)
              }}
            >
              重命名
            </Button>
            <Button
              type="primary"
              onClick={(e) => {
                e.stopPropagation()
                goChunkList(record)
              }}
            >
              查看
            </Button>
            <Popconfirm
              title="确认删除该文件？"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button
                danger
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ]
  }, [
    deleteMutation,
    navigate,
    openPreview,
    openRename,
    safeCollectionId,
    state?.collectionName,
  ])

  return (
    <div>
      <PageHeader
        title={state?.collectionName || '向量库文件'}
        subtitle="管理该向量库下的文件与分段"
        breadcrumb={[{ title: '向量库' }, { title: state?.collectionName || '文件' }]}
        extra={
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/collections')}>
              返回向量库
            </Button>
            <Input.Search
              allowClear
              placeholder="搜索文件名 / ID / 创建人"
              style={{ width: 260 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['documents', safeCollectionId] })}
              disabled={!safeCollectionId}
            >
              刷新
            </Button>
            <Upload
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
              accept="application/pdf"
            >
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={uploadMutation.isPending}
                disabled={!safeCollectionId}
              >
                上传 PDF
              </Button>
            </Upload>
          </Space>
        }
      />

      <Typography.Text className="muted">共 {filteredDocs.length} 个文件</Typography.Text>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={filteredDocs}
        columns={columns}
        size="middle"
        onRow={(record) => ({
          onClick: () => {
            navigate(`/collections/${safeCollectionId}/documents/${record.id}/chunks`, {
              state: {
                collectionName: state?.collectionName,
                documentName: record.fileName,
              },
            })
          },
          style: { cursor: 'pointer' },
        })}
        pagination={{ pageSize: 8, showSizeChanger: true }}
      />

      <Modal
        open={renameOpen}
        title="文件重命名"
        onCancel={() => {
          setRenameOpen(false)
          setSelectedDoc(null)
        }}
        onOk={() => form.submit()}
        okButtonProps={{ loading: updateMutation.isPending }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedDoc || !user) return
            updateMutation.mutate({
              id: selectedDoc.id,
              fileName: values.fileName,
              collectionId: selectedDoc.collectionId,
              createBy: selectedDoc.createBy,
            })
          }}
        >
          <Form.Item
            label="文件名称"
            name="fileName"
            rules={[{ required: true, message: '请输入文件名称' }]}
          >
            <Input placeholder="请输入文件名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={uploadOpen}
        title="上传文件"
        width={720}
        onCancel={() => {
          setUploadOpen(false)
          setPendingFile(null)
          setUploadPercent(0)
          setChunkPreviewData(null)
          setChunkPreviewOpen(false)
          uploadForm.resetFields()
        }}
        onOk={() => uploadForm.submit()}
        okText="确认入库"
        okButtonProps={{ loading: uploadMutation.isPending, disabled: previewChunkMutation.isPending }}
      >
        <Form form={uploadForm} layout="vertical" onFinish={submitUpload}>
          <Form.Item
            label="文件名称"
            name="fileName"
            rules={[{ required: true, message: '请输入文件名称' }]}
          >
            <Input placeholder="请输入文件名称" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12} align="start">
            <Form.Item
              label="分段规则"
              name="chunkRule"
              style={{ flex: 1, minWidth: 220 }}
              rules={[{ required: true, message: '请选择分段规则' }]}
            >
              <Select options={chunkRuleOptions} />
            </Form.Item>
            <Form.Item
              label="分段长度"
              name="chunkSize"
              style={{ width: 120 }}
              rules={[{ required: true, message: '请输入分段长度' }]}
            >
              <InputNumber min={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label="重叠长度"
              name="chunkOverlap"
              style={{ width: 120 }}
              rules={[{ required: true, message: '请输入重叠长度' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label="最小长度"
              name="minChunkSize"
              style={{ width: 120 }}
              rules={[{ required: true, message: '请输入最小长度' }]}
            >
              <InputNumber min={20} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ marginBottom: 8 }}>
            <Button onClick={handlePreviewChunks} loading={chunkPreviewLoading || previewChunkMutation.isPending}>
              预览前10条分段
            </Button>
            {chunkPreviewData?.summary ? (
              <Typography.Text type="secondary">
                共 {chunkPreviewData.summary.total_chunks} 段，平均长度 {chunkPreviewData.summary.avg_length}
              </Typography.Text>
            ) : null}
          </Space>
          {uploadMutation.isPending ? (
            <div style={{ marginTop: 12 }}>
              <Typography.Text className="muted">上传进度</Typography.Text>
              <Progress percent={uploadPercent} size="small" />
            </div>
          ) : null}
        </Form>
      </Modal>

      <Drawer
        title={previewTitle || 'PDF 预览'}
        placement="right"
        width={920}
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false)
          setPreviewLoading(false)
          setPreviewTitle('')
          setPreviewUrl('')
          if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current)
            previewUrlRef.current = ''
          }
        }}
        destroyOnClose
      >
        {previewLoading ? (
          <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin />
          </div>
        ) : previewUrl ? (
          <iframe
            title="pdf-preview"
            src={previewUrl}
            style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 8 }}
          />
        ) : (
          <Typography.Text className="muted">暂无预览内容</Typography.Text>
        )}
      </Drawer>

      <Drawer
        title="分段预览（前10条）"
        placement="right"
        width={780}
        open={chunkPreviewOpen}
        onClose={() => setChunkPreviewOpen(false)}
        destroyOnClose
      >
        {!chunkPreviewData ? (
          <Typography.Text className="muted">暂无分段预览内容</Typography.Text>
        ) : (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="分段规则">{chunkPreviewData.summary.chunk_rule}</Descriptions.Item>
              <Descriptions.Item label="总分段数">{chunkPreviewData.summary.total_chunks}</Descriptions.Item>
              <Descriptions.Item label="分段长度">{chunkPreviewData.summary.chunk_size}</Descriptions.Item>
              <Descriptions.Item label="重叠长度">{chunkPreviewData.summary.chunk_overlap}</Descriptions.Item>
              <Descriptions.Item label="最小长度">{chunkPreviewData.summary.min_chunk_size}</Descriptions.Item>
              <Descriptions.Item label="平均长度">{chunkPreviewData.summary.avg_length}</Descriptions.Item>
            </Descriptions>
            {chunkPreviewData.preview_chunks.map((item, index) => (
              <div key={`${index}-${item.slice(0, 12)}`} style={{ border: '1px solid #e7ebef', borderRadius: 8, padding: 12 }}>
                <Typography.Text strong>{`#${index + 1}`}</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0, marginTop: 6 }}>
                  {item}
                </Typography.Paragraph>
              </div>
            ))}
          </Space>
        )}
      </Drawer>

    </div>
  )
}

export default DocumentList
