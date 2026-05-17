// src/pages/AdminDashboard.tsx
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

const AdminDashboard = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Welcome to Admin Dashboard</h2>
      <p>Current user role: {user?.role || 'Not set'}</p>
    </div>
  );
};
export default AdminDashboard;
