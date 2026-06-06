import { useEffect, useRef } from 'react';
import { Card, Typography } from 'antd';
import client from '../../api/client';
import { useQueryStore } from '../../store/queryStore';

export default function SQLPreview() {
  const { datasourceId, table, fields, filters, groupBy, orderBy, limit, sql, setSql } = useQueryStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!datasourceId || !table) {
      setSql('');
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await client.post('/query/preview', {
          datasource_id: datasourceId,
          table,
          fields,
          filters: filters.filter((f) => f.field),
          group_by: groupBy,
          order_by: orderBy,
          limit,
        });
        setSql(res.data.sql);
      } catch {
        setSql('-- Error generating SQL');
      }
    }, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [datasourceId, table, fields, filters, groupBy, orderBy, limit, setSql]);

  return (
    <Card size="small" title="SQL Preview">
      <pre style={{
        background: '#f5f5f5',
        padding: 12,
        borderRadius: 4,
        fontSize: 13,
        overflow: 'auto',
        maxHeight: 200,
        margin: 0,
        whiteSpace: 'pre-wrap',
      }}>
        {sql || <Typography.Text type="secondary">Select a table and fields to preview SQL</Typography.Text>}
      </pre>
    </Card>
  );
}
