export const TASK_COLORS = [
  { id: 'green', value: '#61bd4f', name: 'Green' },
  { id: 'yellow', value: '#f2d600', name: 'Yellow' },
  { id: 'orange', value: '#ff9f1a', name: 'Orange' },
  { id: 'red', value: '#eb5a46', name: 'Red' },
  { id: 'purple', value: '#c377e0', name: 'Purple' },
  { id: 'blue', value: '#0079bf', name: 'Blue' },
  { id: 'sky', value: '#00c2e0', name: 'Sky' },
  { id: 'lime', value: '#51e898', name: 'Lime' },
  { id: 'pink', value: '#ff78cb', name: 'Pink' },
  { id: 'black', value: '#344563', name: 'Black' }
] as const

export const WORKSPACE_COLORS = [
  { id: 'white', value: '#ffffff', name: 'White' },
  ...TASK_COLORS,
] as const

export const colorValue = (id: string) =>
  TASK_COLORS.find((color) => color.id === id)?.value ?? id

export const isTaskColorId = (id: string) =>
  TASK_COLORS.some((color) => color.id === id)

export const isWorkspaceColorId = (id: string) =>
  WORKSPACE_COLORS.some((color) => color.id === id)

const workspaceTintHex = (id: string | null | undefined) => {
  if (!id || id === 'white') return undefined
  const hex = colorValue(id)
  return hex.startsWith('#') ? hex : undefined
}

const mixToken = (hex: string, token: string, amount: number) =>
  `color-mix(in srgb, ${hex} ${amount}%, hsl(var(${token})))`

const contrastForeground = (hex: string) => {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.62 ? '#1a1a1a' : '#ffffff'
}

const workspaceActionVars = (hex?: string) =>
  hex
    ? {
        '--primary-color': hex,
        '--primary-foreground-color': contrastForeground(hex),
        '--sidebar-primary-color': hex,
        '--sidebar-primary-foreground-color': contrastForeground(hex),
        '--ring-color': hex,
      }
    : {
        '--primary-color': 'hsl(var(--foreground))',
        '--primary-foreground-color': 'hsl(var(--background))',
        '--sidebar-primary-color': 'hsl(var(--muted))',
        '--sidebar-primary-foreground-color': 'hsl(var(--foreground))',
        '--ring-color': 'hsl(var(--foreground))',
      }

export const workspaceThemeVars = (id: string | null | undefined) => {
  const hex = workspaceTintHex(id)
  const actions = workspaceActionVars(hex)
  if (!hex) return actions
  return {
    '--background-color': mixToken(hex, '--background', 18),
    '--card-color': mixToken(hex, '--card', 14),
    '--popover-color': mixToken(hex, '--popover', 14),
    '--muted-color': mixToken(hex, '--muted', 22),
    '--accent-color': mixToken(hex, '--accent', 26),
    '--secondary-color': mixToken(hex, '--secondary', 22),
    '--border-color': mixToken(hex, '--border', 32),
    '--input-color': mixToken(hex, '--input', 32),
    '--sidebar-accent-color': mixToken(hex, '--sidebar-accent', 24),
    '--sidebar-border-color': mixToken(hex, '--sidebar-border', 36),
    ...actions,
  }
}

export const workspaceThemeCss = (id: string | null | undefined) => {
  const vars = workspaceThemeVars(id)
  if (!vars) return undefined
  return Object.entries(vars)
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ')
}

export const workspaceCardColor = (id: string | null | undefined) =>
  workspaceThemeVars(id)?.['--card-color']

const workspaceColorMix = (
  id: string | null | undefined,
  amount: number,
  borderAmount = amount,
) => {
  const hex = workspaceTintHex(id)
  if (!hex) return undefined
  return {
    backgroundColor: mixToken(hex, '--background', amount),
    borderColor: mixToken(hex, '--border', borderAmount),
    ...workspaceThemeVars(id),
  }
}

export const workspaceBackgroundStyle = (id: string | null | undefined) =>
  workspaceColorMix(id, 18, 32)

export const workspaceSidebarStyle = (id: string | null | undefined) =>
  workspaceColorMix(id, 28, 36)
