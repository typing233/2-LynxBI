import { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import client from '../../api/client';
import type { DataSource } from '../../types';

interface Props {
  open: boolean;
  editing: DataSource | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DataSourceForm({ open, editing, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          name: editing.name,
          db_type: editing.db_type,
          host: editing.host,
          port: editing.port,
          database: editing.database,
          username: editing.username,
          pool_size: editing.pool_size,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ db_type: 'postgresql', port: 5432, pool_size: 5 });
      }
    }
  }, [open, editing, form]);

  const handleTypeChange = (value: string) => {
    form.setFieldValue('port', value === 'mysql' ? 3306 : 5432);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await client.put(`/datasources/${editing.id}`, values);
        message.success('Updated');
      } else {
        await client.post('/datasources', values);
        message.success('Created');
      }
      onSuccess();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Operation failed');
    }
  };

  return (
    <Modal
      title={editing ? 'Edit Data Source' : 'Add Data Source'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="My PostgreSQL" />
        </Form.Item>
        <Form.Item name="db_type" label="Database Type" rules={[{ required: true }]}>
          <Select onChange={handleTypeChange}>
            <Select.Option value="postgresql">PostgreSQL</Select.Option>
            <Select.Option value="mysql">MySQL</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="host" label="Host" rules={[{ required: true }]}>
          <Input placeholder="localhost" />
        </Form.Item>
        <Form.Item name="port" label="Port" rules={[{ required: true }]}>
          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="database" label="Database" rules={[{ required: true }]}>
          <Input placeholder="mydb" />
        </Form.Item>
        <Form.Item name="username" label="Username" rules={[{ required: true }]}>
          <Input placeholder="admin" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={editing ? [] : [{ required: true }]}>
          <Input.Password placeholder={editing ? '(unchanged)' : 'password'} />
        </Form.Item>
        <Form.Item name="pool_size" label="Pool Size">
          <InputNumber min={1} max={20} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
