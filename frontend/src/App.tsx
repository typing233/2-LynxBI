import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu } from 'antd';
import { DatabaseOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import DataSources from './pages/DataSources';
import QueryBuilder from './pages/QueryBuilder';

const { Header, Content } = Layout;

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/datasources', icon: <DatabaseOutlined />, label: 'Data Sources' },
    { key: '/query', icon: <SearchOutlined />, label: 'Query Builder' },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 48 }}>
            LynxBI
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ flex: 1 }}
          />
        </Header>
        <Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/datasources" element={<DataSources />} />
            <Route path="/query" element={<QueryBuilder />} />
            <Route path="*" element={<Navigate to="/datasources" replace />} />
          </Routes>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
