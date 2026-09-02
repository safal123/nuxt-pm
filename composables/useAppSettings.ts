import { useLocalStorage } from '@vueuse/core'

export const useAppSettings = () => {
  const emailOnInvite = useLocalStorage('settings-email-on-invite', true)
  const emailOnProjectAdd = useLocalStorage('settings-email-on-project-add', true)
  const showEmailsInActivity = useLocalStorage('settings-emails-in-activity', true)
  const weekStartsOnMonday = useLocalStorage('settings-week-starts-monday', true)
  const compactTables = useLocalStorage('settings-compact-tables', false)

  return {
    emailOnInvite,
    emailOnProjectAdd,
    showEmailsInActivity,
    weekStartsOnMonday,
    compactTables,
  }
}
