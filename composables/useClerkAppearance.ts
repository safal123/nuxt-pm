export const useClerkAppearance = () => {
  const { isDark } = useTheme()

  return computed(() => {
    const dark = isDark.value

    return {
      variables: {
        colorPrimary: '#7c3aed',
        colorBackground: dark ? 'hsl(220, 16%, 19%)' : '#ffffff',
        colorInputBackground: dark ? 'hsl(220, 14%, 22%)' : '#ffffff',
        colorInputText: dark ? '#f8fafc' : '#0f172a',
        colorText: dark ? '#f8fafc' : '#0f172a',
        colorTextSecondary: dark ? '#94a3b8' : '#64748b',
        colorNeutral: dark ? '#cbd5e1' : '#334155',
        borderRadius: '0.5rem',
      },
    }
  })
}
