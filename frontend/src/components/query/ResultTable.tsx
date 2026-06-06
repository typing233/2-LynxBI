import { Table, Empty } from 'antd';
import { useQueryStore } from '../../store/queryStore';

export default function ResultTable() {
  const { result, loading } = useQueryStore();

  if (!result) {
    return <Empty description="Execute a query to see results" style={{ padding: 32 }} />;
  }

  const columns = result.columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    sorter: (a: any, b: any) => {
      const va = a[col], vb = b[col];
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va ?? '').localeCompare(String(vb ?? ''));
    },
    ellipsis: true,
  }));

  return (
    <div>
      <div style={{ marginBottom: 8, color: '#666' }}>
        {result.row_count} row{result.row_count !== 1 ? 's' : ''} returned
      </div>
      <Table
        dataSource={result.rows.map((row, idx) => ({ ...row, _key: idx }))}
        columns={columns}
        rowKey="_key"
        loading={loading}
        size="small"
        scroll={{ x: 'max-content', y: 400 }}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Total ${t} rows` }}
      />
    </div>
  );
}
