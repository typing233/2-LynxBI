import { useState } from 'react';
import { Card, Form, Input, Button, message, Typography, Space } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const { login, register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isRegister) {
        await register(values.username, values.email, values.password);
      } else {
        await login(values.username, values.password);
      }
      message.success(isRegister ? 'Registered successfully' : 'Login successful');
      navigate('/datasources');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Card title={isRegister ? 'Register' : 'Login'} style={{ width: 400 }}>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {isRegister && (
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {isRegister ? 'Register' : 'Login'}
            </Button>
          </Form.Item>
        </Form>
        <Space>
          <Typography.Text>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
          </Typography.Text>
          <Button type="link" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Login' : 'Register'}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
