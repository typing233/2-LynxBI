import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Space, Modal, message, InputNumber, Tooltip, Typography, Empty, List } from 'antd';
import {
  ShareAltOutlined, ReloadOutlined,
  DeleteOutlined, FilterOutlined, HolderOutlined,
} from '@ant-design/icons';
import client from '../../api/client';
import ChartRenderer from '../chart/ChartRenderer';
import DashboardFilterPanel from './DashboardFilterPanel';
import ShareModal from './ShareModal';
import type { Dashboard, SavedChart, QueryFilter } from '../../types';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { GridLayout } from 'react-grid-layout';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RGL = GridLayout as any;

interface DashboardFilters {
  dateRange?: { start: string; end: string };
  dateField?: string;
  custom: QueryFilter[];
}

export default function DashboardCanvas() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [chartDataMap, setChartDataMap] = useState<Record<number, { columns: string[]; rows: Record<string, any>[] }>>({});
  const [availableCharts, setAvailableCharts] = useState<SavedChart[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({ custom: [] });
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [draggedChartId, setDraggedChartId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dashboardId = Number(id);

  const buildFilterList = useCallback((): QueryFilter[] => {
    const filters: QueryFilter[] = [];
    if (dashboardFilters.dateRange && dashboardFilters.dateField) {
      if (dashboardFilters.dateRange.start) {
        filters.push({ field: dashboardFilters.dateField, operator: '>=', value: dashboardFilters.dateRange.start });
      }
      if (dashboardFilters.dateRange.end) {
        filters.push({ field: dashboardFilters.dateField, operator: '<=', value: dashboardFilters.dateRange.end });
      }
    }
    filters.push(...dashboardFilters.custom.filter(f => f.field));
    return filters;
  }, [dashboardFilters]);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await client.get(`/dashboards/${dashboardId}`);
      setDashboard(res.data);
      setRefreshInterval(res.data.refresh_interval);
      if (res.data.filters_config) {
        const fc = res.data.filters_config;
        setDashboardFilters({
          dateRange: fc.dateRange || undefined,
          dateField: fc.dateField || undefined,
          custom: fc.custom || [],
        });
      }
    } catch {
      message.error('Failed to load dashboard');
    }
  }, [dashboardId]);

  const loadAvailableCharts = useCallback(async () => {
    try {
      const res = await client.get('/charts');
      setAvailableCharts(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadChartData = useCallback(async (chartId: number, extraFilters: QueryFilter[] = []) => {
    try {
      const chartRes = await client.get(`/charts/${chartId}`);
      const chart: SavedChart = chartRes.data;
      const queryConfig = { ...chart.query_config };
      if (extraFilters.length) {
        queryConfig.filters = [...(queryConfig.filters || []), ...extraFilters];
      }
      const execRes = await client.post('/query/execute', queryConfig);
      setChartDataMap((prev) => ({
        ...prev,
        [chartId]: { columns: execRes.data.columns, rows: execRes.data.rows },
      }));
      setCharts((prev) => {
        const existing = prev.find((c) => c.id === chart.id);
        if (existing) return prev.map(c => c.id === chart.id ? chart : c);
        return [...prev, chart];
      });
    } catch { /* chart may not have data yet */ }
  }, []);

  const refreshAllCharts = useCallback(() => {
    if (!dashboard) return;
    const filters = buildFilterList();
    dashboard.items.forEach((item) => loadChartData(item.chart_id, filters));
  }, [dashboard, buildFilterList, loadChartData]);

  useEffect(() => { loadDashboard(); loadAvailableCharts(); }, [loadDashboard, loadAvailableCharts]);

  useEffect(() => {
    if (dashboard) {
      const filters = buildFilterList();
      dashboard.items.forEach((item) => loadChartData(item.chart_id, filters));
    }
  }, [dashboard, buildFilterList, loadChartData]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (refreshInterval && refreshInterval > 0) {
      timerRef.current = setInterval(refreshAllCharts, refreshInterval * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refreshInterval, refreshAllCharts]);

  const handleLayoutChange = async (newLayout: readonly any[]) => {
    if (!dashboard) return;
    const items = newLayout.map((l: any) => ({
      id: Number(l.i),
      x: l.x, y: l.y, w: l.w, h: l.h,
    }));
    try {
      await client.put(`/dashboards/${dashboardId}/layout`, { items });
    } catch { /* debounce errors */ }
  };

  const handleDropChart = async (chartId: number) => {
    try {
      await client.post(`/dashboards/${dashboardId}/items`, { chart_id: chartId });
      loadDashboard();
      loadAvailableCharts();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to add chart');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await client.delete(`/dashboards/${dashboardId}/items/${itemId}`);
      loadDashboard();
    } catch { message.error('Failed to remove'); }
  };

  const handleSaveFilters = async () => {
    try {
      await client.put(`/dashboards/${dashboardId}`, {
        filters_config: dashboardFilters,
        refresh_interval: refreshInterval,
      });
      message.success('Dashboard settings saved');
      setFilterOpen(false);
      refreshAllCharts();
    } catch {
      message.error('Failed to save settings');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedChartId !== null) {
      handleDropChart(draggedChartId);
      setDraggedChartId(null);
    }
  };

  if (!dashboard) return <Empty description="Loading..." />;

  const layout = dashboard.items.map((item) => ({
    i: String(item.id),
    x: item.x, y: item.y, w: item.w, h: item.h,
    minW: 2, minH: 2,
  }));

  const chartsOnDashboard = new Set(dashboard.items.map(i => i.chart_id));
  const chartsNotOnDashboard = availableCharts.filter(c => !chartsOnDashboard.has(c.id));

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Sidebar: draggable chart list */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <Card size="small" title="Saved Charts" style={{ position: 'sticky', top: 16 }}>
          {chartsNotOnDashboard.length === 0 ? (
            <Empty description="No charts to add" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              size="small"
              dataSource={chartsNotOnDashboard}
              renderItem={(chart) => (
                <List.Item
                  draggable
                  onDragStart={(e) => {
                    setDraggedChartId(chart.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('text/plain', String(chart.id));
                  }}
                  onDragEnd={() => setDraggedChartId(null)}
                  style={{ cursor: 'grab', padding: '6px 8px' }}
                >
                  <Space>
                    <HolderOutlined style={{ color: '#999' }} />
                    <Typography.Text ellipsis style={{ maxWidth: 150 }}>{chart.name}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      {/* Main canvas */}
      <div style={{ flex: 1, minWidth: 0 }} ref={containerRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{dashboard.name}</Typography.Title>
          <Space>
            <Tooltip title="Filters & Settings">
              <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)} />
            </Tooltip>
            <Tooltip title="Refresh All">
              <Button icon={<ReloadOutlined />} onClick={refreshAllCharts} />
            </Tooltip>
            <Button icon={<ShareAltOutlined />} onClick={() => setShareOpen(true)}>Share</Button>
          </Space>
        </div>

        {/* Active filter summary */}
        {dashboardFilters.dateRange && dashboardFilters.dateField && (
          <div style={{ marginBottom: 12, padding: '4px 12px', background: '#f0f5ff', borderRadius: 4 }}>
            <Typography.Text type="secondary">
              Date filter: <b>{dashboardFilters.dateField}</b> from <b>{dashboardFilters.dateRange.start || '...'}</b> to <b>{dashboardFilters.dateRange.end || '...'}</b>
            </Typography.Text>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            minHeight: 400,
            border: draggedChartId !== null ? '2px dashed #1677ff' : '2px dashed transparent',
            borderRadius: 8,
            transition: 'border-color 0.2s',
            padding: draggedChartId !== null ? 8 : 0,
          }}
        >
          {dashboard.items.length === 0 && draggedChartId === null ? (
            <Empty description="Drag charts from the sidebar to add them here" style={{ marginTop: 80 }} />
          ) : (
            <RGL
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={80}
              width={1000}
              onLayoutChange={handleLayoutChange}
            >
              {dashboard.items.map((item) => {
                const chart = charts.find((c) => c.id === item.chart_id);
                const chartData = chartDataMap[item.chart_id];
                return (
                  <div key={String(item.id)}>
                    <Card
                      size="small"
                      title={<span style={{ cursor: 'move' }}>{chart?.name || 'Loading...'}</span>}
                      extra={
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveItem(item.id)} />
                      }
                      style={{ height: '100%' }}
                      styles={{ body: { height: 'calc(100% - 38px)', padding: 8 } }}
                    >
                      {chart && chartData ? (
                        <ChartRenderer
                          chartType={chart.chart_type}
                          data={chartData}
                          config={chart.chart_config}
                        />
                      ) : (
                        <Empty description="Loading..." />
                      )}
                    </Card>
                  </div>
                );
              })}
            </RGL>
          )}
          {draggedChartId !== null && dashboard.items.length > 0 && (
            <div style={{ textAlign: 'center', padding: 16, color: '#1677ff' }}>
              Drop here to add chart
            </div>
          )}
        </div>
      </div>

      <Modal title="Dashboard Settings" open={filterOpen} onOk={handleSaveFilters} onCancel={() => setFilterOpen(false)} width={640}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text strong>Auto-refresh interval (seconds):</Typography.Text>
            <InputNumber
              min={0}
              value={refreshInterval}
              onChange={(v) => setRefreshInterval(v)}
              style={{ marginLeft: 8, width: 120 }}
              placeholder="0 = off"
            />
          </div>
          <DashboardFilterPanel
            filters={dashboardFilters}
            onChange={setDashboardFilters}
          />
        </Space>
      </Modal>

      <ShareModal dashboardId={dashboardId} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
