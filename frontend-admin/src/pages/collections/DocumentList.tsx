import { useMemo, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { RcFile } from 'antd/es/upload'
import { deleteDocument, getDocumentsByCollection, updateDocument, uploadDocument } from '../../api/documents'
import type { DocumentDto } from '../../types/api'
import { useAuth } from '../../hooks/useAuth'

interface LocationState {
  collectionName?: string
}

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
        },
        payload.file,
      ),
    onSuccess: () => {
      message.success('文件上传成功')
      queryClient.invalidateQueries({ queryKey: ['documents', safeCollectionId] })
    },
    onError: (error: any) => message.error(error?.message || '上传失败'),
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

  const openRename = (doc: DocumentDto) => {
    setSelectedDoc(doc)
    form.setFieldsValue({ fileName: doc.fileName })
    setRenameOpen(true)
  }

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
    uploadForm.setFieldsValue({ fileName: file.name })
    setUploadOpen(true)
    return false
  }

  const submitUpload = async (values: { fileName: string }) => {
    if (!pendingFile) return
    try {
      await uploadMutation.mutateAsync({ file: pendingFile, fileName: values.fileName })
      setUploadOpen(false)
      setPendingFile(null)
      uploadForm.resetFields()
    } catch (error) {
      // error message handled by mutation
    }
  }

  const columns = useMemo(() => {
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
        width: 280,
        render: (_: unknown, record: DocumentDto) => (
          <Space>
            <Button onClick={() => openRename(record)}>重命名</Button>
            <Button
              onClick={() =>
                navigate(`/collections/${safeCollectionId}/documents/${record.id}/chunks`, {
                  state: {
                    collectionName: state?.collectionName,
                    documentName: record.fileName,
                  },
                })
              }
            >
              分段
            </Button>
            <Popconfirm
              title="确认删除该文件？"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button danger>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ]
  }, [deleteMutation])

  return (
    <div>
      <div className="list-toolbar">
        <Space direction="vertical" size={4}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/collections')}>
              返回向量库
            </Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {state?.collectionName || '向量库文件'}
            </Typography.Title>
          </Space>
          <Typography.Text className="muted">管理该向量库下的文件与分段</Typography.Text>
        </Space>
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
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 8 }}
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
        onCancel={() => {
          setUploadOpen(false)
          setPendingFile(null)
          uploadForm.resetFields()
        }}
        onOk={() => uploadForm.submit()}
        okButtonProps={{ loading: uploadMutation.isPending }}
      >
        <Form form={uploadForm} layout="vertical" onFinish={submitUpload}>
          <Form.Item
            label="文件名称"
            name="fileName"
            rules={[{ required: true, message: '请输入文件名称' }]}
          >
            <Input placeholder="请输入文件名称" />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  )
}

export default DocumentList
