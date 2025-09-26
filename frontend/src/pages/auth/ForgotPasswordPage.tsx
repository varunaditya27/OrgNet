import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
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
import { Spinner } from '@/components/ui/spinner'
import { useForgotPasswordMutation } from '@/hooks/api/auth'
import { ROUTES } from '@/routes/paths'

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter the email associated with your account'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

const ForgotPasswordPage = () => {
  const mutation = useForgotPasswordMutation()

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    await mutation.mutateAsync(values)
    form.reset(values)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Reset your password</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your work email and we&apos;ll send a secure reset link.
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
                    type="email"
                    placeholder="you@organization.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  A reset link will be delivered if the account exists.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Sending reset link...
              </span>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        Remembered your password?{' '}
        <Link to={ROUTES.auth.login} className="font-medium text-primary hover:text-primary/80">
          Return to sign in
        </Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
