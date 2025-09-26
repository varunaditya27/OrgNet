import { Outlet } from 'react-router-dom'

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <Outlet />
      </div>
    </div>
  )
}
