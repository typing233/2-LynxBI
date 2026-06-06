import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Button, Space, Typography } from 'antd';
import { DatabaseOutlined, SearchOutlined, DashboardOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import DataSources from './pages/DataSources';
import QueryBuilder from './pages/QueryBuilder';
import Dashboards from './pages/Dashboards';
import DashboardView from './pages/DashboardView';
import Login from './pages/Login';
import PublicDashboard from './pages/PublicDashboard';

const { Header, Content } = Layout;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { key: '/datasources', icon: <DatabaseOutlined />, label: 'Data Sources' },
    { key: '/query', icon: <SearchOutlined />, label: 'Query Builder' },
    { key: '/dashboards', icon: <DashboardOutlined />, label: 'Dashboards' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 48 }}>
          LynxBI
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname.startsWith('/dashboards') ? '/dashboards' : location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1 }}
        />
        {user && (
          <Space>
            <Typography.Text style={{ color: '#fff' }}><UserOutlined /> {user.username}</Typography.Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#fff' }} />
          </Space>
        )}
      </Header>
      <Content style={{ padding: 24 }}>
        <Routes>
          <Route path="/datasources" element={<ProtectedRoute><DataSources /></ProtectedRoute>} />
          <Route path="/query" element={<ProtectedRoute><QueryBuilder /></ProtectedRoute>} />
          <Route path="/dashboards" element={<ProtectedRoute><Dashboards /></ProtectedRoute>} />
          <Route path="/dashboards/:id" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/datasources" replace />} />
        </Routes>
      </Content>
    </Layout>
  );
}

function App() {
  const { loadUser, token } = useAuthStore();

  useEffect(() => {
    if (token) loadUser();
  }, []);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Routes>
        <Route path="/public/:token" element={<PublicDashboard />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
