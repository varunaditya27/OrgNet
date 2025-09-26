import { useContext } from 'react'

import { MessagingContext } from '@/contexts/messaging-context'

export const useMessaging = () => {
  const context = useContext(MessagingContext)

  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider')
  }

  return context
}
