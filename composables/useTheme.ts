type ThemePreference = 'light' | 'dark' | 'auto'

const unwrap = (value: unknown) => {
  if (typeof value !== 'string') return ''
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') return parsed
  } catch {
    // Stored as a raw color-mode value.
  }
  return value.replace(/^"|"$/g, '')
}

const asPreference = (value: string): ThemePreference => {
  if (value === 'light' || value === 'dark') return value
  return 'auto'
}

export const useTheme = () => {
  const colorMode = useColorMode()
  const resolvedCookie = useCookie<'dark' | 'light' | null>('ns-theme', {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  const preference = computed({
    get: (): ThemePreference => asPreference(unwrap(colorMode.preference)),
    set: (next: ThemePreference) => {
      colorMode.preference = next === 'auto' ? 'system' : next
    },
  })

  const isDark = computed(() => {
    const resolved = unwrap(colorMode.value)
    if (resolved === 'dark') return true
    if (resolved === 'light') return false
    const pref = unwrap(colorMode.preference)
    if (pref === 'dark') return true
    if (pref === 'light') return false
    return resolvedCookie.value === 'dark'
  })

  useHead({
    htmlAttrs: {
      class: computed(() => ({
        dark: isDark.value,
        light: preference.value === 'light',
      })),
    },
  })

  if (import.meta.client) {
    watch(
      isDark,
      (dark) => {
        resolvedCookie.value = dark ? 'dark' : 'light'
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      },
      { immediate: true },
    )
  }

  const setPreference = (next: ThemePreference) => {
    preference.value = next
  }

  const toggleTheme = () => {
    colorMode.preference = isDark.value ? 'light' : 'dark'
  }

  return { preference, isDark, toggleTheme, setPreference }
}
