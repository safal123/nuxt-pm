import { useLocalStorage, usePreferredDark } from '@vueuse/core'

export const useTheme = () => {
  const preference = useLocalStorage<'light' | 'dark' | 'auto'>(
    'nuxt-color-mode',
    'auto',
  )
  const prefersDark = usePreferredDark()
  const isDark = computed(
    () =>
      preference.value === 'dark' ||
      (preference.value !== 'light' && prefersDark.value),
  )

  const apply = (dark: boolean) => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('dark', dark)
  }

  if (import.meta.client) {
    watch(isDark, apply, { immediate: true })
  }

  const setPreference = (next: 'light' | 'dark' | 'auto') => {
    preference.value = next
  }

  const toggleTheme = () => {
    preference.value = isDark.value ? 'light' : 'dark'
  }

  return { preference, isDark, toggleTheme, setPreference }
}
