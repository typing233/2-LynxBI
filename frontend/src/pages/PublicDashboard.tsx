import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Empty, Button, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import client from '../api/client';
import ChartRenderer from '../components/chart/ChartRenderer';
import DashboardFilterPanel from '../components/dashboard/DashboardFilterPanel';
import type { QueryFilter, ChartConfig } from '../types';

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

interface SharedDashboard {
  id: number;
  name: string;
  description: string | null;
  filters_config: { filters: QueryFilter[] } | null;
  refresh_interval: number | null;
  charts: SharedChart[];
}

export default function PublicDashboard() {
  const { token } = useParams<{ token: string }>();
  const [dashboard, setDashboard] = useState<SharedDashboard | null>(null);
  const [chartDataMap, setChartDataMap] = useState<Record<number, { columns: string[]; rows: Record<string, any>[] }>>({});
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await client.get(`/share/${token}`);
      setDashboard(res.data);
      if (res.data.filters_config?.filters) {
        setFilters(res.data.filters_config.filters);
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
    dashboard.charts.forEach((c) => loadChartData(c.chart_id, filters));
  }, [dashboard, filters, loadChartData]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (dashboard) {
      dashboard.charts.forEach((c) => loadChartData(c.chart_id, filters));
    }
  }, [dashboard, filters, loadChartData]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (dashboard?.refresh_interval && dashboard.refresh_interval > 0) {
      timerRef.current = setInterval(refreshAll, dashboard.refresh_interval * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [dashboard?.refresh_interval, refreshAll]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Empty description={error} style={{ marginTop: 100 }} />;
  if (!dashboard) return null;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>{dashboard.name}</Typography.Title>
          {dashboard.description && <Typography.Text type="secondary">{dashboard.description}</Typography.Text>}
        </div>
        <Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>
      </div>

      {filters.length > 0 && (
        <Card size="small" title="Filters" style={{ marginBottom: 16 }}>
          <DashboardFilterPanel filters={filters} onChange={(f) => { setFilters(f); }} />
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
