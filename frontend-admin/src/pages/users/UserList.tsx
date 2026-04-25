import { useMemo, useState } from 'react'
import {
  Button,
  Form,
  Input,
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
import type { UserDto } from '../../types/api'
import { createUser, deleteUser, getUsers, updateUser, updateUserPassword } from '../../api/users'
import PageHeader from '../../components/PageHeader'
import AdminEmptyState from '../../components/AdminEmptyState'
import { CITY_OPTIONS, getCityLabel } from '../../constants/city'
import { useAuth } from '../../hooks/useAuth'

const roleOptions = [
  { label: '超级管理员', value: 0 },
  { label: '管理员', value: 1 },
  { label: '普通用户', value: 2 },
]

const statusOptions = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
]

const UserList: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null)
  const [keyword, setKeyword] = useState('')
  const [roleId, setRoleId] = useState<number | undefined>(undefined)
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [city, setCity] = useState<number | undefined>(undefined)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [pwdForm] = Form.useForm()

  const { data = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const filteredUsers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    const list = normalized
      ? (data as Array<any>).filter((u: { id: string; username: string; city: string | number }) =>
          u.id.toLowerCase().includes(normalized) ||
          u.username.toLowerCase().includes(normalized) ||
          getCityLabel(u.city).toLowerCase().includes(normalized))
      : data
    const byRole = roleId === undefined ? list : (list as Array<any>).filter((u: { roleId: number }) => u.roleId === roleId)
    const byStatus = status === undefined ? byRole : (byRole as Array<any>).filter((u: { status: number }) => u.status === status)
    const byCity = city === undefined ? byStatus : (byStatus as Array<any>).filter((u: { city: any }) => Number(u.city) === city)
    // @ts-ignore
    return [...byCity].sort((a, b) => dayjs(b.updateTime).valueOf() - dayjs(a.updateTime).valueOf())
  }, [data, keyword, roleId, status, city])

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      message.success('用户创建成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      createForm.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '创建失败'),
  })

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      message.success('用户信息已更新')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditOpen(false)
      setSelectedUser(null)
      editForm.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '更新失败'),
  })

  const passwordMutation = useMutation({
    mutationFn: updateUserPassword,
    onSuccess: () => {
      message.success('密码已更新')
      setPwdOpen(false)
      setSelectedUser(null)
      pwdForm.resetFields()
    },
    onError: (error: any) => message.error(error?.message || '更新失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      message.success('用户已删除')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => message.error(error?.message || '删除失败'),
  })

  const columns = [
    {
      title: '手机号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '角色',
      dataIndex: 'roleId',
      key: 'roleId',
      render: (value: number) => roleOptions.find((item) => item.value === value)?.label,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      render: (value: number | string) => getCityLabel(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: number) =>
        value === 0 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: UserDto) => {
        const isCurrentUser = record.id === user?.userId

        return (
        <Space>
          <Button
            onClick={() => {
              setSelectedUser(record)
              editForm.setFieldsValue({
                username: record.username,
                city: record.city,
                roleId: record.roleId,
                status: record.status,
              })
              setEditOpen(true)
            }}
          >
            编辑
          </Button>
          <Button
            onClick={() => {
              setSelectedUser(record)
              setPwdOpen(true)
            }}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确认删除该用户？"
            description="删除后该用户将无法继续登录系统。"
            overlayClassName="admin-danger-popconfirm"
            onConfirm={() => deleteMutation.mutate(record.id)}
            disabled={isCurrentUser}
          >
            <Button danger disabled={isCurrentUser} title={isCurrentUser ? '当前登录用户不能删除自己' : undefined}>
              删除
            </Button>
          </Popconfirm>
        </Space>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="用户管理"
        subtitle="管理系统内的用户与角色"
        extra={
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索手机号 / 用户名 / 城市"
              style={{ width: 240 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              allowClear
              placeholder="角色"
              style={{ width: 160 }}
              options={roleOptions}
              value={roleId}
              onChange={(v) => setRoleId(v)}
            />
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 140 }}
              options={statusOptions}
              value={status}
              onChange={(v) => setStatus(v)}
            />
            <Select
              allowClear
              placeholder="城市"
              style={{ width: 170 }}
              options={CITY_OPTIONS}
              value={city}
              onChange={(v) => setCity(v)}
            />
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建用户
            </Button>
          </Space>
        }
      />

      <div className="admin-toolbar-panel">
        <div className="admin-toolbar-meta">
          <span className="admin-summary-chip">当前共 {filteredUsers.length} 个用户</span>
          {roleId !== undefined ? <span className="admin-summary-chip subtle">已按角色筛选</span> : null}
          {status !== undefined ? <span className="admin-summary-chip subtle">已按状态筛选</span> : null}
          {city !== undefined ? <span className="admin-summary-chip subtle">已按城市筛选</span> : null}
        </div>
      </div>

      <Table
          className="admin-table"
          rowKey="id"
          loading={isLoading}
          dataSource={filteredUsers}
          columns={columns}
          size="middle"
          rowClassName={(record) => (Number(record.status) === 1 ? 'admin-row-disabled' : 'admin-row-soft')}
          locale={{
            emptyText: (
              <AdminEmptyState
                title="暂无用户数据"
                description="当前没有符合条件的用户记录，可以尝试调整筛选条件或新建用户。"
              />
            ),
          }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title="新建用户"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        okButtonProps={{ loading: createMutation.isPending }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            label="手机号"
            name="id"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="所属城市"
            name="city"
            rules={[{ required: true, message: '请选择所属城市' }]}
          >
            <Select options={CITY_OPTIONS} placeholder="请选择所属城市" />
          </Form.Item>
          <Form.Item
            label="初始密码"
            name="password"
            rules={[
              { required: true, message: '请输入初始密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleId"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select options={roleOptions} placeholder="请选择角色" />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select options={statusOptions} placeholder="请选择状态" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑用户"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          setSelectedUser(null)
        }}
        onOk={() => editForm.submit()}
        okButtonProps={{ loading: updateMutation.isPending }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedUser) return
            updateMutation.mutate({
              id: selectedUser.id,
              ...values,
            })
          }}
        >
          <Form.Item label="手机号">
            <Input value={selectedUser?.id} disabled />
          </Form.Item>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="所属城市"
            name="city"
            rules={[{ required: true, message: '请选择所属城市' }]}
          >
            <Select options={CITY_OPTIONS} placeholder="请选择所属城市" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleId"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select options={roleOptions} placeholder="请选择角色" />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select options={statusOptions} placeholder="请选择状态" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={pwdOpen}
        onCancel={() => {
          setPwdOpen(false)
          setSelectedUser(null)
        }}
        onOk={() => pwdForm.submit()}
        okButtonProps={{ loading: passwordMutation.isPending }}
      >
        <Form
          form={pwdForm}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedUser) return
            passwordMutation.mutate({ userId: selectedUser.id, password: values.password })
          }}
        >
          <Form.Item label="手机号">
            <Input value={selectedUser?.id} disabled />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserList
