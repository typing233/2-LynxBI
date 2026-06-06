import { create } from 'zustand';
import type { QueryField, QueryFilter, QueryOrderBy, QueryResult } from '../types';

interface QueryStore {
  datasourceId: number | null;
  table: string | null;
  fields: QueryField[];
  filters: QueryFilter[];
  groupBy: string[];
  orderBy: QueryOrderBy[];
  limit: number;
  sql: string;
  result: QueryResult | null;
  loading: boolean;

  setDatasource: (id: number | null) => void;
  setTable: (table: string | null) => void;
  setFields: (fields: QueryField[]) => void;
  setFilters: (filters: QueryFilter[]) => void;
  setGroupBy: (groupBy: string[]) => void;
  setOrderBy: (orderBy: QueryOrderBy[]) => void;
  setLimit: (limit: number) => void;
  setSql: (sql: string) => void;
  setResult: (result: QueryResult | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  datasourceId: null,
  table: null,
  fields: [],
  filters: [],
  groupBy: [],
  orderBy: [],
  limit: 100,
  sql: '',
  result: null,
  loading: false,
};

export const useQueryStore = create<QueryStore>((set) => ({
  ...initialState,
  setDatasource: (id) => set({ datasourceId: id, table: null, fields: [], filters: [], groupBy: [], orderBy: [], sql: '', result: null }),
  setTable: (table) => set({ table, fields: [], filters: [], groupBy: [], orderBy: [], sql: '', result: null }),
  setFields: (fields) => set({ fields }),
  setFilters: (filters) => set({ filters }),
  setGroupBy: (groupBy) => set({ groupBy }),
  setOrderBy: (orderBy) => set({ orderBy }),
  setLimit: (limit) => set({ limit }),
  setSql: (sql) => set({ sql }),
  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}));
