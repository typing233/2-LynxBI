import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Modal, Input, Form, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import client from '../api/client';
import type { Dashboard } from '../types';

export default function Dashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      const res = await client.get('/dashboards');
      setDashboards(res.data);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await client.post('/dashboards', values);
      message.success('Dashboard created');
      setModalOpen(false);
      form.resetFields();
      loadDashboards();
    } catch (err: any) {
      if (err.response) message.error(err.response.data?.detail || 'Failed');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/dashboards/${id}`);
      message.success('Dashboard deleted');
      loadDashboards();
    } catch { message.error('Failed to delete'); }
  };

  return (
    <div>
      <Card
        title="Dashboards"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Dashboard</Button>}
      >
        <Table
          dataSource={dashboards}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'name', render: (name: string, record: Dashboard) => (
              <a onClick={() => navigate(`/dashboards/${record.id}`)}>{name}</a>
            )},
            { title: 'Description', dataIndex: 'description' },
            { title: 'Charts', render: (_: any, record: Dashboard) => record.items?.length || 0 },
            { title: 'Created', dataIndex: 'created_at', render: (v: string) => v?.slice(0, 10) },
            {
              title: 'Actions',
              render: (_: any, record: Dashboard) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/dashboards/${record.id}`)} />
                  <Popconfirm title="Delete?" onConfirm={() => handleDelete(record.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal title="New Dashboard" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
