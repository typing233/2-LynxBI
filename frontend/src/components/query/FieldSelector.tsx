import { useEffect, useState } from 'react';
import { Checkbox, Select, Input, List, Space, Tag } from 'antd';
import client from '../../api/client';
import type { ColumnInfo, QueryField } from '../../types';
import { useQueryStore } from '../../store/queryStore';

const AGGREGATES = ['', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

export default function FieldSelector() {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const { datasourceId, table, fields, setFields } = useQueryStore();

  useEffect(() => {
    if (datasourceId && table) {
      client.get(`/metadata/${datasourceId}/tables/${table}/columns`).then((res) => setColumns(res.data));
    } else {
      setColumns([]);
    }
  }, [datasourceId, table]);

  const isSelected = (colName: string) => fields.some((f) => f.name === colName);

  const toggleField = (colName: string, checked: boolean) => {
    if (checked) {
      setFields([...fields, { name: colName }]);
    } else {
      setFields(fields.filter((f) => f.name !== colName));
    }
  };

  const updateField = (colName: string, updates: Partial<QueryField>) => {
    setFields(fields.map((f) => f.name === colName ? { ...f, ...updates } : f));
  };

  if (!table) return <div style={{ color: '#999', padding: 8 }}>Select a table first</div>;

  return (
    <List
      size="small"
      dataSource={columns}
      renderItem={(col) => (
        <List.Item style={{ padding: '4px 0' }}>
          <Space style={{ width: '100%' }} align="center">
            <Checkbox
              checked={isSelected(col.column_name)}
              onChange={(e) => toggleField(col.column_name, e.target.checked)}
            />
            <span style={{ minWidth: 120 }}>
              {col.column_name}
              {col.is_primary_key && <Tag color="gold" style={{ marginLeft: 4 }}>PK</Tag>}
            </span>
            <Tag>{col.data_type}</Tag>
            {isSelected(col.column_name) && (
              <>
                <Select
                  size="small"
                  style={{ width: 90 }}
                  value={fields.find((f) => f.name === col.column_name)?.aggregate || ''}
                  onChange={(val) => updateField(col.column_name, { aggregate: val || undefined })}
                  options={AGGREGATES.map((a) => ({ label: a || 'None', value: a }))}
                />
                <Input
                  size="small"
                  style={{ width: 100 }}
                  placeholder="Alias"
                  value={fields.find((f) => f.name === col.column_name)?.alias || ''}
                  onChange={(e) => updateField(col.column_name, { alias: e.target.value || undefined })}
                />
              </>
            )}
          </Space>
        </List.Item>
      )}
    />
  );
}
