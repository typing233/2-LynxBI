import { useEffect, useState } from 'react';
import { Card, Select, Space } from 'antd';
import client from '../../api/client';
import type { ColumnInfo } from '../../types';
import { useQueryStore } from '../../store/queryStore';

export default function AggregationPanel() {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const { datasourceId, table, groupBy, setGroupBy } = useQueryStore();

  useEffect(() => {
    if (datasourceId && table) {
      client.get(`/metadata/${datasourceId}/tables/${table}/columns`).then((res) => setColumns(res.data));
    }
  }, [datasourceId, table]);

  return (
    <Card size="small" title="Group By">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select fields to group by"
          value={groupBy}
          onChange={setGroupBy}
          options={columns.map((c) => ({ label: c.column_name, value: c.column_name }))}
        />
      </Space>
    </Card>
  );
}
