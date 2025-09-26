import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { useLoginMutation } from '@/hooks/api/auth'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/routes/paths'

const loginSchema = z.object({
  email: z.string().email('Enter a valid work email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, hasHydrated, isAuthenticating } = useAuth()
  const loginMutation = useLoginMutation()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: true,
    },
  })

  useEffect(() => {
    if (!user) return
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname
    navigate(from ?? ROUTES.dashboard.home, { replace: true })
  }, [user, navigate, location.state])

  const onSubmit = async (values: LoginFormValues) => {
    await loginMutation.mutateAsync({
      email: values.email,
      password: values.password,
    })
    navigate(ROUTES.dashboard.home, { replace: true })
  }

  if (!hasHydrated) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Sign in to OrgNet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Access secure collaboration tools and organizational insights.
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@organization.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-2">
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">Stay signed in</FormLabel>
                    <FormDescription>
                      Keep me signed in on this device for faster access.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Link
              to={ROUTES.auth.forgotPassword}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending || isAuthenticating}
          >
            {loginMutation.isPending || isAuthenticating ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </Form>

      <p className="text-sm text-muted-foreground">
        New to OrgNet?{' '}
        <Link to={ROUTES.auth.register} className="font-medium text-primary hover:text-primary/80">
          Create an account
        </Link>
      </p>
    </div>
  )
}

export default LoginPage
