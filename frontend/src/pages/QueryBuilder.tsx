import { Button, Card, InputNumber, Space, Typography, message, Row, Col } from 'antd';
import { PlayCircleOutlined, ClearOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useQueryStore } from '../store/queryStore';
import TableSelector from '../components/query/TableSelector';
import FieldSelector from '../components/query/FieldSelector';
import FilterBuilder from '../components/query/FilterBuilder';
import AggregationPanel from '../components/query/AggregationPanel';
import SQLPreview from '../components/query/SQLPreview';
import ResultTable from '../components/query/ResultTable';
import ChartBuilder from '../components/chart/ChartBuilder';

export default function QueryBuilder() {
  const store = useQueryStore();

  const handleExecute = async () => {
    if (!store.datasourceId || !store.table) {
      message.warning('Please select a data source and table');
      return;
    }
    store.setLoading(true);
    try {
      const res = await client.post('/query/execute', {
        datasource_id: store.datasourceId,
        table: store.table,
        fields: store.fields,
        filters: store.filters.filter((f) => f.field),
        group_by: store.groupBy,
        order_by: store.orderBy,
        limit: store.limit,
      });
      store.setResult(res.data);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Query failed');
    } finally {
      store.setLoading(false);
    }
  };

  return (
    <div>
      <Typography.Title level={3}>Query Builder</Typography.Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small" title="Data Source & Table" style={{ marginBottom: 16 }}>
            <TableSelector />
          </Card>
          <Card size="small" title="Fields" style={{ marginBottom: 16, maxHeight: 400, overflow: 'auto' }}>
            <FieldSelector />
          </Card>
        </Col>
        <Col span={18}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <FilterBuilder />
            </Col>
            <Col span={12}>
              <AggregationPanel />
              <Card size="small" title="Options" style={{ marginTop: 16 }}>
                <Space>
                  <span>Limit:</span>
                  <InputNumber
                    min={1}
                    max={10000}
                    value={store.limit}
                    onChange={(val) => store.setLimit(val || 100)}
                    style={{ width: 100 }}
                  />
                </Space>
              </Card>
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <SQLPreview />
          </div>
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleExecute}
                loading={store.loading}
                disabled={!store.datasourceId || !store.table}
              >
                Execute Query
              </Button>
              <Button icon={<ClearOutlined />} onClick={store.reset}>Reset</Button>
            </Space>
          </div>
          <ResultTable />
          <div style={{ marginTop: 24 }}>
            <ChartBuilder />
          </div>
        </Col>
      </Row>
    </div>
  );
}
