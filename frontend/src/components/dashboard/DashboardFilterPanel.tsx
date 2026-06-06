import { Button, Input, Select, Space, DatePicker, Typography, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { QueryFilter } from '../../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];

interface DashboardFilters {
  dateRange?: { start: string; end: string };
  dateField?: string;
  custom: QueryFilter[];
}

interface DashboardFilterPanelProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export default function DashboardFilterPanel({ filters, onChange }: DashboardFilterPanelProps) {
  const updateDateField = (value: string) => {
    onChange({ ...filters, dateField: value });
  };

  const updateDateRange = (dates: any) => {
    if (!dates || dates.length < 2) {
      onChange({ ...filters, dateRange: undefined });
      return;
    }
    onChange({
      ...filters,
      dateRange: {
        start: dates[0]?.format('YYYY-MM-DD') || '',
        end: dates[1]?.format('YYYY-MM-DD') || '',
      },
    });
  };

  const addCustomFilter = () => {
    onChange({ ...filters, custom: [...filters.custom, { field: '', operator: '=', value: '' }] });
  };

  const removeCustomFilter = (index: number) => {
    onChange({ ...filters, custom: filters.custom.filter((_, i) => i !== index) });
  };

  const updateCustomFilter = (index: number, partial: Partial<QueryFilter>) => {
    const updated = filters.custom.map((f, i) => (i === index ? { ...f, ...partial } : f));
    onChange({ ...filters, custom: updated });
  };

  const dateRangeValue = filters.dateRange
    ? [
        filters.dateRange.start ? dayjs(filters.dateRange.start) : null,
        filters.dateRange.end ? dayjs(filters.dateRange.end) : null,
      ] as [dayjs.Dayjs | null, dayjs.Dayjs | null]
    : null;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Date Range Filter */}
      <div>
        <Typography.Text strong>Date Range Filter</Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          All charts with the specified date field will filter by this range
        </Typography.Text>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="Date field name (e.g. created_at, order_date)"
            value={filters.dateField || ''}
            onChange={(e) => updateDateField(e.target.value)}
            style={{ width: '100%' }}
          />
          <RangePicker
            value={dateRangeValue}
            onChange={updateDateRange}
            style={{ width: '100%' }}
            allowClear
          />
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* Custom Filters */}
      <div>
        <Typography.Text strong>Custom Filters</Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Additional filters applied to all charts (matching fields will be filtered)
        </Typography.Text>
        {filters.custom.map((filter, index) => (
          <Space key={index} style={{ width: '100%', marginBottom: 8 }}>
            <Input
              placeholder="Field name"
              value={filter.field}
              onChange={(e) => updateCustomFilter(index, { field: e.target.value })}
              style={{ width: 150 }}
            />
            <Select
              value={filter.operator}
              onChange={(v) => updateCustomFilter(index, { operator: v })}
              options={OPERATORS.map((op) => ({ label: op, value: op }))}
              style={{ width: 120 }}
            />
            <Input
              placeholder="Value"
              value={filter.value}
              onChange={(e) => updateCustomFilter(index, { value: e.target.value })}
              style={{ width: 150 }}
            />
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeCustomFilter(index)} />
          </Space>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={addCustomFilter} block>
          Add Custom Filter
        </Button>
      </div>
    </Space>
  );
}
