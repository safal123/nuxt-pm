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

// Chroma of a fully saturated palette colour. Anything less saturated scales
// the whole ramp down proportionally, so a muted pick such as "Black" stays
// near-neutral instead of reading as a vivid blue.
const REFERENCE_CHROMA = 0.15

const srgbToLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const hexToOklch = (hex: string) => {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((index) =>
    srgbToLinear(parseInt(value.slice(index, index + 2), 16) / 255),
  )
  const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const medium = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short
  const b2 = 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short
  const hue = (Math.atan2(b2, a) * 180) / Math.PI
  return {
    lightness: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    chroma: Math.hypot(a, b2),
    hue: hue < 0 ? hue + 360 : hue,
  }
}

// Naturally light hues such as yellow and lime read as khaki once pinned to a
// mid lightness, so they lift the light ramp toward their own lightness. Capped
// so no colour can wash the ramp out.
const rampLift = (lightness: number) =>
  Math.min(5.5, Math.max(0, (lightness - 0.62) * 22))

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

export const workspaceThemeVars = (
  id: string | null | undefined,
): Record<string, string> => {
  const hex = workspaceTintHex(id)
  const actions = workspaceActionVars(hex)
  if (!hex) return actions
  const { lightness, chroma, hue } = hexToOklch(hex)
  return {
    // Only the hue, an intensity scale and a lightness nudge are published. The
    // per-surface ramp lives in assets/css/main.css so it can differ between
    // light and dark mode from a single set of injected values.
    '--ws-hue': hue.toFixed(1),
    '--ws-chroma': Math.min(1, chroma / REFERENCE_CHROMA).toFixed(3),
    '--ws-lift': `${rampLift(lightness).toFixed(2)}%`,
    // Drop feedback is meant to be obvious, so the outline uses the raw colour.
    '--dropzone-border-color': hex,
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

export const hasWorkspaceTint = (id: string | null | undefined) =>
  Boolean(workspaceTintHex(id))
