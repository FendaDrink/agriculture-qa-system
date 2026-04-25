import { Card, Form, Input, Button, Typography, Space, Tag, message } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { login as loginApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const Login: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      login(data.token)
      message.success('登录成功')
      navigate('/collections')
    },
    onError: (error: any) => {
      message.error(error?.message || '登录失败')
    },
  })

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-aside">
          <Tag bordered={false} color="green" className="login-kicker">
            后台入口
          </Tag>
          <Typography.Title level={1} className="login-hero-title">
            农业知识问答助手
            <br />
            后台管理中心
          </Typography.Title>
          <Typography.Paragraph className="login-hero-desc">
            用于管理用户、知识库、资料分段、常见问题和日志审计，整体风格与前台服务端保持统一。
          </Typography.Paragraph>
          <Space wrap className="login-feature-list">
            <span className="login-feature-pill">用户与城市管理</span>
            <span className="login-feature-pill">知识库与文件管理</span>
            <span className="login-feature-pill">FAQ 与日志审计</span>
          </Space>
        </div>
        <Card className="login-card">
          <div className="login-title">账号登录</div>
          <Typography.Paragraph className="muted login-copy">
            登录后进入后台管理中心
          </Typography.Paragraph>
        <Form
          layout="vertical"
          onFinish={(values) => mutation.mutate(values)}
          initialValues={{
            userId: '',
            password: '',
          }}
        >
          <Form.Item
            label="手机号"
            name="userId"
            rules={[{ required: true, message: '请输入手机号' }]}
          >
            <Input placeholder="请输入账号" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={mutation.isPending}>
            登录
          </Button>
        </Form>
        </Card>
      </div>
    </div>
  )
}

export default Login
