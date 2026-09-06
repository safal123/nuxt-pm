import { useLocalStorage } from '@vueuse/core'

export const useAppSettings = () => {
  const showEmailsInActivity = useLocalStorage('settings-emails-in-activity', true)

  return {
    showEmailsInActivity,
  }
}
