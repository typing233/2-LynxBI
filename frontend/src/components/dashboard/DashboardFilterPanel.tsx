import { Button, Input, Select, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { QueryFilter } from '../../types';

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];

interface DashboardFilterPanelProps {
  filters: QueryFilter[];
  onChange: (filters: QueryFilter[]) => void;
}

export default function DashboardFilterPanel({ filters, onChange }: DashboardFilterPanelProps) {
  const addFilter = () => {
    onChange([...filters, { field: '', operator: '=', value: '' }]);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, partial: Partial<QueryFilter>) => {
    const updated = filters.map((f, i) => (i === index ? { ...f, ...partial } : f));
    onChange(updated);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {filters.map((filter, index) => (
        <Space key={index} style={{ width: '100%' }}>
          <Input
            placeholder="Field name"
            value={filter.field}
            onChange={(e) => updateFilter(index, { field: e.target.value })}
            style={{ width: 150 }}
          />
          <Select
            value={filter.operator}
            onChange={(v) => updateFilter(index, { operator: v })}
            options={OPERATORS.map((op) => ({ label: op, value: op }))}
            style={{ width: 120 }}
          />
          <Input
            placeholder="Value"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            style={{ width: 150 }}
          />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeFilter(index)} />
        </Space>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={addFilter} block>
        Add Filter
      </Button>
    </Space>
  );
}
