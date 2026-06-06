import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import client from '../../api/client';
import type { DataSource } from '../../types';
import DataSourceForm from './DataSourceForm';

export default function DataSourceList() {
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DataSource | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await client.get('/datasources');
      setDatasources(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleDelete = async (id: number) => {
    await client.delete(`/datasources/${id}`);
    message.success('Deleted');
    fetchList();
  };

  const handleTest = async (id: number) => {
    const res = await client.post(`/datasources/${id}/test`);
    if (res.data.success) {
      message.success('Connection successful');
    } else {
      message.error(`Connection failed: ${res.data.message}`);
    }
  };

  const handleSync = async (id: number) => {
    try {
      const res = await client.post(`/metadata/sync/${id}`);
      message.success(res.data.message);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Sync failed');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Type', dataIndex: 'db_type', key: 'db_type',
      render: (t: string) => <Tag color={t === 'postgresql' ? 'blue' : 'orange'}>{t.toUpperCase()}</Tag>,
    },
    { title: 'Host', dataIndex: 'host', key: 'host' },
    { title: 'Port', dataIndex: 'port', key: 'port' },
    { title: 'Database', dataIndex: 'database', key: 'database' },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: DataSource) => (
        <Space>
          <Button size="small" onClick={() => handleTest(record.id)}>Test</Button>
          <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync(record.id)}>Sync</Button>
          <Button size="small" onClick={() => { setEditing(record); setFormOpen(true); }}>Edit</Button>
          <Popconfirm title="Delete this datasource?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add Data Source
        </Button>
      </div>
      <Table
        dataSource={datasources}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
      />
      <DataSourceForm
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { setFormOpen(false); fetchList(); }}
      />
    </>
  );
}
