import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PageHeader } from '@/components/ui/page-header'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateUserMutation } from '@/hooks/api/users'
import { toast } from 'sonner'

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Use your organizational email'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const settingsStorageKey = 'orgnet-preferences'

type NotificationPreferences = {
  emailAlerts: boolean
  weeklyDigest: boolean
  escalations: boolean
}

const SettingsPage = () => {
  const { user, setUser } = useAuth()
  const updateMutation = useUpdateUserMutation(user?.id ?? 0)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name, email: user.email })
    }
  }, [user, form])

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(settingsStorageKey) : null
    if (!stored) {
      return {
        emailAlerts: true,
        weeklyDigest: true,
        escalations: true,
      }
    }
    try {
      return JSON.parse(stored) as NotificationPreferences
    } catch {
      return {
        emailAlerts: true,
        weeklyDigest: true,
        escalations: true,
      }
    }
  })

  const onSubmitProfile = async (values: ProfileFormValues) => {
    if (!user) return
    const updated = await updateMutation.mutateAsync(values)
    setUser(updated)
    toast.success('Profile updated')
  }

  const onSavePreferences = () => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(preferences))
    toast.success('Notification preferences saved')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Account settings"
        description="Maintain personal details and tune notifications for critical events."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmitProfile)}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@organization.com" {...field} />
                      </FormControl>
                      <FormDescription>Used for alerts and policy notifications.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save profile'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PreferenceRow
              title="Security alerts"
              description="Critical overrides and policy escalations."
              checked={preferences.emailAlerts}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, emailAlerts: Boolean(checked) }))
              }
            />
            <PreferenceRow
              title="Weekly digest"
              description="Summary of team activity, new files, and messaging stats."
              checked={preferences.weeklyDigest}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, weeklyDigest: Boolean(checked) }))
              }
            />
            <PreferenceRow
              title="Escalation follow-ups"
              description="Reminders to close out high-priority tasks and overrides."
              checked={preferences.escalations}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, escalations: Boolean(checked) }))
              }
            />
            <Button variant="outline" onClick={onSavePreferences}>
              Save preferences
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Password rotations and privileged elevation are enforced centrally by your OrgNet
            administrators. Reach out to security operations for MFA resets or temporary overrides.
          </p>
          <p>
            Your account is protected with RBAC and anomaly monitoring. You can view the complete audit
            history for your actions on the Audit Trail page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsPage

interface PreferenceRowProps {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const PreferenceRow = ({ title, description, checked, onCheckedChange }: PreferenceRowProps) => {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
    </div>
  )
}
