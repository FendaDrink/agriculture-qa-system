import { Card, Form, Input, Button, Typography, message } from 'antd'
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
      <Card className="login-card">
        <div className="login-title">知识库管理后台</div>
        <Typography.Paragraph className="muted">
          登录后管理用户、向量库与分段
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
  )
}

export default Login
