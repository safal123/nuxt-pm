import { usePreferredDark } from '@vueuse/core'

type ThemePreference = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'nuxt-color-mode'

const readStored = (): ThemePreference => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'auto'
    const parsed = JSON.parse(raw)
    if (parsed === 'light' || parsed === 'dark' || parsed === 'auto') return parsed
  } catch {
    // Ignore malformed values from older builds.
  }
  return 'auto'
}

export const useTheme = () => {
  const preference = useState<ThemePreference>('theme-preference', () => 'auto')
  const prefersDark = usePreferredDark()
  const isDark = computed(
    () =>
      preference.value === 'dark' ||
      (preference.value !== 'light' && prefersDark.value),
  )

  const apply = (dark: boolean) => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference.value))
  }

  if (import.meta.client) {
    preference.value = readStored()
    watch(isDark, apply, { immediate: true })
  }

  const setPreference = (next: ThemePreference) => {
    preference.value = next
  }

  const toggleTheme = () => {
    const currentlyDark = import.meta.client
      ? document.documentElement.classList.contains('dark')
      : isDark.value
    preference.value = currentlyDark ? 'light' : 'dark'
  }

  return { preference, isDark, toggleTheme, setPreference }
}
