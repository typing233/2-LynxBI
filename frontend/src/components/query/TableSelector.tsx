import { useEffect, useState } from 'react';
import { Select, Space } from 'antd';
import client from '../../api/client';
import type { DataSource, TableInfo } from '../../types';
import { useQueryStore } from '../../store/queryStore';

export default function TableSelector() {
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const { datasourceId, table, setDatasource, setTable } = useQueryStore();

  useEffect(() => {
    client.get('/datasources').then((res) => setDatasources(res.data));
  }, []);

  useEffect(() => {
    if (datasourceId) {
      client.get(`/metadata/${datasourceId}/tables`).then((res) => setTables(res.data));
    } else {
      setTables([]);
    }
  }, [datasourceId]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        placeholder="Select Data Source"
        style={{ width: '100%' }}
        value={datasourceId}
        onChange={(val) => setDatasource(val)}
        allowClear
        options={datasources.map((ds) => ({ label: `${ds.name} (${ds.db_type})`, value: ds.id }))}
      />
      <Select
        placeholder="Select Table"
        style={{ width: '100%' }}
        value={table}
        onChange={(val) => setTable(val)}
        allowClear
        disabled={!datasourceId}
        showSearch
        options={tables.map((t) => ({ label: t.table_name, value: t.table_name }))}
      />
    </Space>
  );
}
