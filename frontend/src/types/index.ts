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
