import { useAuthStore } from '@/stores/authStore'
import { Navigate, Outlet } from 'react-router-dom'

export default function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
