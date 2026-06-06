import { Form, Input, Select, Switch, Space } from 'antd';
import type { ChartConfig } from '../../types';

interface ChartConfigPanelProps {
  config: ChartConfig;
  columns: string[];
  onChange: (config: ChartConfig) => void;
}

const CHART_TYPES = [
  { label: 'Bar', value: 'bar' },
  { label: 'Line', value: 'line' },
  { label: 'Area', value: 'area' },
  { label: 'Pie', value: 'pie' },
  { label: 'Scatter', value: 'scatter' },
];

export { CHART_TYPES };

export default function ChartConfigPanel({ config, columns, onChange }: ChartConfigPanelProps) {
  const update = (partial: Partial<ChartConfig>) => onChange({ ...config, ...partial });

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical" size="small">
        <Form.Item label="Title">
          <Input
            value={config.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Chart title"
          />
        </Form.Item>
        <Form.Item label="Category Field (X-Axis / Label)">
          <Select
            value={config.categoryField}
            onChange={(v) => update({ categoryField: v })}
            options={columns.map((c) => ({ label: c, value: c }))}
            placeholder="Select category field"
          />
        </Form.Item>
        <Form.Item label="Value Fields (Y-Axis / Values)">
          <Select
            mode="multiple"
            value={config.valueFields || []}
            onChange={(v) => update({ valueFields: v })}
            options={columns.map((c) => ({ label: c, value: c }))}
            placeholder="Select value fields"
          />
        </Form.Item>
        <Form.Item label="X-Axis Label">
          <Input
            value={config.xAxisLabel || ''}
            onChange={(e) => update({ xAxisLabel: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="Y-Axis Label">
          <Input
            value={config.yAxisLabel || ''}
            onChange={(e) => update({ yAxisLabel: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="Show Legend">
          <Switch
            checked={config.showLegend !== false}
            onChange={(v) => update({ showLegend: v })}
          />
        </Form.Item>
        <Form.Item label="Show Grid">
          <Switch
            checked={config.showGrid !== false}
            onChange={(v) => update({ showGrid: v })}
          />
        </Form.Item>
      </Form>
    </Space>
  );
}
