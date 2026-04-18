import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login'
import MainLayout from '../layouts/MainLayout'
import CollectionList from '../pages/collections/CollectionList'
import DocumentList from '../pages/collections/DocumentList'
import ChunkList from '../pages/collections/ChunkList'
import UserList from '../pages/users/UserList'
import Recall from '../pages/Recall'
import LogList from '../pages/logs/LogList'
import { useAuth } from '../hooks/useAuth'

const RequireAuth: React.FC = () => {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

const RequireRole: React.FC<{ roles: number[] }> = ({ roles }) => {
  const { user } = useAuth()
  if (!user || !roles.includes(user.roleId)) {
    return <Navigate to="/collections" replace />
  }
  return <Outlet />
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/collections" replace />} />
        <Route path="/collections" element={<CollectionList />} />
        <Route path="/collections/:collectionId/documents" element={<DocumentList />} />
        <Route
          path="/collections/:collectionId/documents/:documentId/chunks"
          element={<ChunkList />}
        />
        <Route path="/recall" element={<Recall />} />
        <Route element={<RequireRole roles={[0, 1]} />}>
          <Route path="/users" element={<UserList />} />
          <Route path="/logs" element={<LogList />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/collections" replace />} />
  </Routes>
)

export default AppRoutes
