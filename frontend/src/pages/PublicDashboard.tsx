import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Empty, Button, Spin, DatePicker, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import ChartRenderer from '../components/chart/ChartRenderer';
import type { QueryFilter, ChartConfig } from '../types';

const { RangePicker } = DatePicker;

interface SharedChart {
  item_id: number;
  chart_id: number;
  name: string;
  chart_type: string;
  datasource_id: number;
  query_config: any;
  chart_config: ChartConfig;
  layout: { x: number; y: number; w: number; h: number };
}

interface DashboardFiltersConfig {
  dateRange?: { start: string; end: string };
  dateField?: string;
  custom?: QueryFilter[];
}

interface SharedDashboard {
  id: number;
  name: string;
  description: string | null;
  filters_config: DashboardFiltersConfig | null;
  refresh_interval: number | null;
  charts: SharedChart[];
}

export default function PublicDashboard() {
  const { token } = useParams<{ token: string }>();
  const [dashboard, setDashboard] = useState<SharedDashboard | null>(null);
  const [chartDataMap, setChartDataMap] = useState<Record<number, { columns: string[]; rows: Record<string, any>[] }>>({});
  const [dateField, setDateField] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildFilterList = useCallback((): QueryFilter[] => {
    const filters: QueryFilter[] = [];
    if (dateRange && dateField) {
      if (dateRange.start) filters.push({ field: dateField, operator: '>=', value: dateRange.start });
      if (dateRange.end) filters.push({ field: dateField, operator: '<=', value: dateRange.end });
    }
    if (dashboard?.filters_config?.custom) {
      filters.push(...dashboard.filters_config.custom.filter(f => f.field));
    }
    return filters;
  }, [dateRange, dateField, dashboard]);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await client.get(`/share/${token}`);
      setDashboard(res.data);
      if (res.data.filters_config) {
        const fc = res.data.filters_config;
        if (fc.dateField) setDateField(fc.dateField);
        if (fc.dateRange) setDateRange(fc.dateRange);
      }
      setLoading(false);
    } catch {
      setError('Dashboard not found or sharing is disabled');
      setLoading(false);
    }
  }, [token]);

  const loadChartData = useCallback(async (chartId: number, extraFilters: QueryFilter[] = []) => {
    try {
      const res = await client.post(`/share/${token}/query`, {
        chart_id: chartId,
        filters: extraFilters,
      });
      setChartDataMap((prev) => ({
        ...prev,
        [chartId]: { columns: res.data.columns, rows: res.data.rows },
      }));
    } catch { /* ignore individual chart failures */ }
  }, [token]);

  const refreshAll = useCallback(() => {
    if (!dashboard) return;
    const filters = buildFilterList();
    dashboard.charts.forEach((c) => loadChartData(c.chart_id, filters));
  }, [dashboard, buildFilterList, loadChartData]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (dashboard) {
      const filters = buildFilterList();
      dashboard.charts.forEach((c) => loadChartData(c.chart_id, filters));
    }
  }, [dashboard, buildFilterList, loadChartData]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (dashboard?.refresh_interval && dashboard.refresh_interval > 0) {
      timerRef.current = setInterval(refreshAll, dashboard.refresh_interval * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [dashboard?.refresh_interval, refreshAll]);

  const handleDateChange = (dates: any) => {
    if (!dates || dates.length < 2) {
      setDateRange(null);
    } else {
      setDateRange({
        start: dates[0]?.format('YYYY-MM-DD') || '',
        end: dates[1]?.format('YYYY-MM-DD') || '',
      });
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Empty description={error} style={{ marginTop: 100 }} />;
  if (!dashboard) return null;

  const dateRangeValue = dateRange
    ? [
        dateRange.start ? dayjs(dateRange.start) : null,
        dateRange.end ? dayjs(dateRange.end) : null,
      ] as [dayjs.Dayjs | null, dayjs.Dayjs | null]
    : null;

  const hasDateFilter = !!dateField;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>{dashboard.name}</Typography.Title>
          {dashboard.description && <Typography.Text type="secondary">{dashboard.description}</Typography.Text>}
        </div>
        <Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>
      </div>

      {hasDateFilter && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Typography.Text strong>Date filter ({dateField}):</Typography.Text>
            <RangePicker
              value={dateRangeValue}
              onChange={handleDateChange}
              allowClear
            />
            <Button type="primary" size="small" onClick={refreshAll}>Apply</Button>
          </Space>
        </Card>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16,
      }}>
        {dashboard.charts.map((chart) => {
          const data = chartDataMap[chart.chart_id];
          const colSpan = chart.layout.w;
          return (
            <div
              key={chart.item_id}
              style={{ gridColumn: `span ${colSpan}`, minHeight: chart.layout.h * 80 }}
            >
              <Card title={chart.name} size="small" style={{ height: '100%' }} styles={{ body: { height: 'calc(100% - 38px)' } }}>
                {data ? (
                  <ChartRenderer chartType={chart.chart_type} data={data} config={chart.chart_config} />
                ) : (
                  <Spin style={{ display: 'block', margin: '40px auto' }} />
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
