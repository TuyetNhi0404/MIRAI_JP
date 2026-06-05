// src/pages/AdminDashboard.tsx
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

const AdminDashboard = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Chào mừng bạn đến với Trang Quản Trị</h2>
      <p>Vai trò người dùng hiện tại: {user?.role || 'Chưa thiết lập'}</p>
    </div>
  );
};
export default AdminDashboard;
