import { Link } from 'react-router-dom'

import { ROUTES } from '@/routes/paths'

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-3xl font-semibold">Page not found</h2>
      <p className="max-w-md text-center text-muted-foreground">
        The page you are looking for might have been moved or does not exist. Use
        the dashboard navigation to continue.
      </p>
      <Link
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-sm hover:bg-primary/90"
        to={ROUTES.dashboard.home}
      >
        Back to dashboard
      </Link>
    </div>
  )
}

export default NotFoundPage
