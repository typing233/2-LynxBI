export interface DataSource {
  id: number;
  name: string;
  db_type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  pool_size: number;
  created_at: string;
  updated_at: string;
}

export interface DataSourceCreate {
  name: string;
  db_type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  pool_size: number;
}

export interface TableInfo {
  schema_name: string | null;
  table_name: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  column_order: number;
}

export interface QueryField {
  name: string;
  aggregate?: string;
  alias?: string;
}

export interface QueryFilter {
  field: string;
  operator: string;
  value: any;
}

export interface QueryOrderBy {
  field: string;
  direction: string;
  aggregate?: string;
}

export interface QueryRequest {
  datasource_id: number;
  table: string;
  fields: QueryField[];
  filters: QueryFilter[];
  group_by: string[];
  order_by: QueryOrderBy[];
  limit: number;
}

export interface QueryResult {
  sql: string;
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
}

// --- Chart types ---

export interface ChartConfig {
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  categoryField?: string;
  valueFields?: string[];
}

export interface SavedChart {
  id: number;
  user_id: number;
  name: string;
  chart_type: string;
  datasource_id: number | null;
  query_config: QueryRequest;
  chart_config: ChartConfig;
  created_at?: string;
  updated_at?: string;
}

// --- Dashboard types ---

export interface DashboardItem {
  id: number;
  dashboard_id: number;
  chart_id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardFiltersConfig {
  filters: QueryFilter[];
}

export interface Dashboard {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  filters_config: DashboardFiltersConfig | null;
  refresh_interval: number | null;
  items: DashboardItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ShareLink {
  id: number;
  dashboard_id: number;
  token: string;
  is_enabled: boolean;
  created_at?: string;
}

// --- Auth types ---

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
