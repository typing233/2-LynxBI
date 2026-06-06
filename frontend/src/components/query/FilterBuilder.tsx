import { useEffect, useState } from 'react';
import { Button, Select, Input, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import client from '../../api/client';
import type { ColumnInfo, QueryFilter } from '../../types';
import { useQueryStore } from '../../store/queryStore';

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'];

export default function FilterBuilder() {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const { datasourceId, table, filters, setFilters } = useQueryStore();

  useEffect(() => {
    if (datasourceId && table) {
      client.get(`/metadata/${datasourceId}/tables/${table}/columns`).then((res) => setColumns(res.data));
    }
  }, [datasourceId, table]);

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: '=', value: '' }]);
  };

  const updateFilter = (idx: number, updates: Partial<QueryFilter>) => {
    const newFilters = [...filters];
    newFilters[idx] = { ...newFilters[idx], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (idx: number) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  const needsValue = (op: string) => !['IS NULL', 'IS NOT NULL'].includes(op);

  return (
    <Card size="small" title="Filters" extra={<Button size="small" icon={<PlusOutlined />} onClick={addFilter}>Add</Button>}>
      {filters.length === 0 && <div style={{ color: '#999' }}>No filters applied</div>}
      {filters.map((filter, idx) => (
        <Space key={idx} style={{ marginBottom: 8, width: '100%' }} align="center">
          <Select
            size="small"
            style={{ width: 140 }}
            placeholder="Field"
            value={filter.field || undefined}
            onChange={(val) => updateFilter(idx, { field: val })}
            showSearch
            options={columns.map((c) => ({ label: c.column_name, value: c.column_name }))}
          />
          <Select
            size="small"
            style={{ width: 110 }}
            value={filter.operator}
            onChange={(val) => updateFilter(idx, { operator: val })}
            options={OPERATORS.map((op) => ({ label: op, value: op }))}
          />
          {needsValue(filter.operator) && (
            <Input
              size="small"
              style={{ width: 160 }}
              placeholder="Value"
              value={typeof filter.value === 'object' ? JSON.stringify(filter.value) : filter.value}
              onChange={(e) => {
                let val: any = e.target.value;
                if (['IN', 'NOT IN'].includes(filter.operator)) {
                  try { val = JSON.parse(val); } catch { /* keep as string */ }
                }
                updateFilter(idx, { value: val });
              }}
            />
          )}
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => removeFilter(idx)} />
        </Space>
      ))}
    </Card>
  );
}
