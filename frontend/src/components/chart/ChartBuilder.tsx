import { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Button, Input, message, Space, Table, Empty } from 'antd';
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import client from '../../api/client';
import ChartRenderer from './ChartRenderer';
import ChartConfigPanel, { CHART_TYPES } from './ChartConfigPanel';
import type { SavedChart, ChartConfig } from '../../types';
import { useQueryStore } from '../../store/queryStore';

export default function ChartBuilder() {
  const { result } = useQueryStore();
  const [chartType, setChartType] = useState('bar');
  const [chartConfig, setChartConfig] = useState<ChartConfig>({});
  const [chartName, setChartName] = useState('');
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);

  const queryStore = useQueryStore();

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    try {
      const res = await client.get('/charts');
      setSavedCharts(res.data);
    } catch { /* ignore if not authed */ }
  };

  const handleSave = async () => {
    if (!chartName.trim()) {
      message.warning('Please enter a chart name');
      return;
    }
    if (!result) {
      message.warning('Please execute a query first');
      return;
    }
    try {
      await client.post('/charts', {
        name: chartName,
        chart_type: chartType,
        datasource_id: queryStore.datasourceId,
        query_config: {
          datasource_id: queryStore.datasourceId,
          table: queryStore.table,
          fields: queryStore.fields,
          filters: queryStore.filters,
          group_by: queryStore.groupBy,
          order_by: queryStore.orderBy,
          limit: queryStore.limit,
        },
        chart_config: chartConfig,
      });
      message.success('Chart saved');
      setChartName('');
      loadCharts();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to save chart');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/charts/${id}`);
      message.success('Chart deleted');
      loadCharts();
    } catch {
      message.error('Failed to delete');
    }
  };

  const columns = result?.columns || [];
  const data = result ? { columns: result.columns, rows: result.rows } : { columns: [], rows: [] };

  return (
    <div>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="Chart Preview" style={{ marginBottom: 16 }}>
            {result ? (
              <div style={{ height: 400 }}>
                <ChartRenderer chartType={chartType} data={data} config={chartConfig} />
              </div>
            ) : (
              <Empty description="Execute a query to see chart preview" style={{ padding: 80 }} />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Chart Configuration" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                value={chartType}
                onChange={setChartType}
                options={CHART_TYPES}
                style={{ width: '100%' }}
              />
              <ChartConfigPanel config={chartConfig} columns={columns} onChange={setChartConfig} />
              <Input
                placeholder="Chart name"
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
              />
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} block>
                Save Chart
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {savedCharts.length > 0 && (
        <Card title="Saved Charts" style={{ marginTop: 16 }}>
          <Table
            dataSource={savedCharts}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Name', dataIndex: 'name' },
              { title: 'Type', dataIndex: 'chart_type' },
              { title: 'Created', dataIndex: 'created_at', render: (v: string) => v?.slice(0, 10) },
              {
                title: 'Actions',
                render: (_: any, record: SavedChart) => (
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
