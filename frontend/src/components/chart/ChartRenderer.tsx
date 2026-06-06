import ReactECharts from 'echarts-for-react';
import type { ChartConfig } from '../../types';

interface ChartRendererProps {
  chartType: string;
  data: { columns: string[]; rows: Record<string, any>[] };
  config: ChartConfig;
  style?: React.CSSProperties;
}

const DEFAULT_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

export default function ChartRenderer({ chartType, data, config, style }: ChartRendererProps) {
  const option = buildOption(chartType, data, config);
  return <ReactECharts option={option} style={{ height: '100%', width: '100%', ...style }} />;
}

function buildOption(
  chartType: string,
  data: { columns: string[]; rows: Record<string, any>[] },
  config: ChartConfig,
) {
  const categoryField = config.categoryField || data.columns[0];
  const valueFields = config.valueFields?.length ? config.valueFields : data.columns.slice(1);
  const categories = data.rows.map((r) => r[categoryField]);
  const colors = config.colors?.length ? config.colors : DEFAULT_COLORS;

  if (chartType === 'pie') {
    const valueField = valueFields[0];
    const pieData = data.rows.map((r) => ({ name: String(r[categoryField]), value: Number(r[valueField]) }));
    return {
      title: config.title ? { text: config.title, left: 'center' } : undefined,
      tooltip: { trigger: 'item' },
      legend: config.showLegend !== false ? { bottom: 0 } : undefined,
      color: colors,
      series: [{ type: 'pie', radius: '60%', data: pieData }],
    };
  }

  const series = valueFields.map((field) => ({
    name: field,
    type: chartType === 'area' ? 'line' : chartType,
    data: data.rows.map((r) => Number(r[field])),
    ...(chartType === 'area' ? { areaStyle: {} } : {}),
    smooth: chartType === 'line' || chartType === 'area',
  }));

  return {
    title: config.title ? { text: config.title, left: 'center' } : undefined,
    tooltip: { trigger: 'axis' },
    legend: config.showLegend !== false ? { bottom: 0 } : undefined,
    grid: config.showGrid !== false ? { left: '3%', right: '4%', bottom: '15%', containLabel: true } : undefined,
    color: colors,
    xAxis: {
      type: 'category',
      data: categories,
      name: config.xAxisLabel,
    },
    yAxis: {
      type: 'value',
      name: config.yAxisLabel,
    },
    series,
  };
}
