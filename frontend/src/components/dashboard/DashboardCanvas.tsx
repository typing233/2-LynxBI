import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Select, Space, Modal, message, InputNumber, Tooltip, Typography, Empty } from 'antd';
import {
  PlusOutlined, ShareAltOutlined, ReloadOutlined,
  DeleteOutlined, FilterOutlined,
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

export default function DashboardCanvas() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [chartDataMap, setChartDataMap] = useState<Record<number, { columns: string[]; rows: Record<string, any>[] }>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [availableCharts, setAvailableCharts] = useState<SavedChart[]>([]);
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<QueryFilter[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dashboardId = Number(id);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await client.get(`/dashboards/${dashboardId}`);
      setDashboard(res.data);
      setRefreshInterval(res.data.refresh_interval);
      if (res.data.filters_config?.filters) {
        setGlobalFilters(res.data.filters_config.filters);
      }
    } catch {
      message.error('Failed to load dashboard');
    }
  }, [dashboardId]);

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
        if (prev.find((c) => c.id === chart.id)) return prev;
        return [...prev, chart];
      });
    } catch { /* chart may not have data yet */ }
  }, []);

  const refreshAllCharts = useCallback(() => {
    if (!dashboard) return;
    dashboard.items.forEach((item) => loadChartData(item.chart_id, globalFilters));
  }, [dashboard, globalFilters, loadChartData]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (dashboard) {
      dashboard.items.forEach((item) => loadChartData(item.chart_id, globalFilters));
    }
  }, [dashboard, globalFilters, loadChartData]);

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

  const handleAddChart = async () => {
    if (!selectedChartId) return;
    try {
      await client.post(`/dashboards/${dashboardId}/items`, { chart_id: selectedChartId });
      setAddModalOpen(false);
      setSelectedChartId(null);
      loadDashboard();
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

  const openAddModal = async () => {
    try {
      const res = await client.get('/charts');
      setAvailableCharts(res.data);
    } catch { /* ignore */ }
    setAddModalOpen(true);
  };

  const handleSaveFilters = async () => {
    try {
      await client.put(`/dashboards/${dashboardId}`, {
        filters_config: { filters: globalFilters },
        refresh_interval: refreshInterval,
      });
      message.success('Dashboard settings saved');
      setFilterOpen(false);
    } catch {
      message.error('Failed to save settings');
    }
  };

  if (!dashboard) return <Empty description="Loading..." />;

  const layout = dashboard.items.map((item) => ({
    i: String(item.id),
    x: item.x, y: item.y, w: item.w, h: item.h,
    minW: 2, minH: 2,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{dashboard.name}</Typography.Title>
        <Space>
          <Tooltip title="Filter">
            <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)} />
          </Tooltip>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={refreshAllCharts} />
          </Tooltip>
          <Button icon={<PlusOutlined />} onClick={openAddModal}>Add Chart</Button>
          <Button icon={<ShareAltOutlined />} onClick={() => setShareOpen(true)}>Share</Button>
        </Space>
      </div>

      {dashboard.items.length === 0 ? (
        <Empty description="No charts yet. Click 'Add Chart' to get started." />
      ) : (
        <RGL
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={80}
          width={1200}
          onLayoutChange={handleLayoutChange}
        >
          {dashboard.items.map((item) => {
            const chart = charts.find((c) => c.id === item.chart_id);
            const chartData = chartDataMap[item.chart_id];
            return (
              <div key={String(item.id)}>
                <Card
                  size="small"
                  title={<span className="drag-handle" style={{ cursor: 'move' }}>{chart?.name || 'Loading...'}</span>}
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

      <Modal title="Add Chart" open={addModalOpen} onOk={handleAddChart} onCancel={() => setAddModalOpen(false)}>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a chart"
          value={selectedChartId}
          onChange={setSelectedChartId}
          options={availableCharts.map((c) => ({ label: c.name, value: c.id }))}
        />
      </Modal>

      <Modal title="Dashboard Settings" open={filterOpen} onOk={handleSaveFilters} onCancel={() => setFilterOpen(false)} width={600}>
        <Space direction="vertical" style={{ width: '100%' }}>
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
          <Typography.Text strong>Global Filters:</Typography.Text>
          <DashboardFilterPanel filters={globalFilters} onChange={setGlobalFilters} />
        </Space>
      </Modal>

      <ShareModal dashboardId={dashboardId} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
