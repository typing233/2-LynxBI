import { Typography } from 'antd';
import DataSourceList from '../components/datasource/DataSourceList';

export default function DataSources() {
  return (
    <div>
      <Typography.Title level={3}>Data Sources</Typography.Title>
      <DataSourceList />
    </div>
  );
}
