/**
 * Inject the theme bootstrap script as the first <head> tag so it runs before
 * CSS. Unhead scripts land after stylesheets, which lets the light :root
 * tokens paint for a frame.
 *
 * Also merge the resolved theme onto <html> from cookies so SSR HTML already
 * has class="dark" / color-scheme, and Unhead hydration cannot wipe a class
 * that was only added by the inline script.
 */
const THEME_SCRIPT = `(function(){try{var k='nuxt-color-mode';var r=localStorage.getItem(k);var s='system';if(r){try{var p=JSON.parse(r);if(p==='light'||p==='dark'||p==='system')s=p;else if(p==='auto')s='system';else if(r==='light'||r==='dark'||r==='system'||r==='auto')s=r==='auto'?'system':r}catch(e){if(r==='light'||r==='dark'||r==='system'||r==='auto')s=r==='auto'?'system':r}}if(s!==r)try{localStorage.setItem(k,s)}catch(e){}}var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.add(d?'dark':'light');e.classList.remove(d?'light':'dark');e.style.colorScheme=d?'dark':'light';document.cookie='ns-theme='+(d?'dark':'light')+'; path=/; max-age=31536000; samesite=lax';document.cookie=k+'='+s+'; path=/; max-age=31536000; samesite=lax'}catch(e){}})();`

const unwrapCookie = (value: string | undefined) => {
  if (!value) return ''
  try {
    const parsed = JSON.parse(decodeURIComponent(value))
    if (typeof parsed === 'string') return parsed
  } catch {
    // Raw cookie.
  }
  try {
    return decodeURIComponent(value).replace(/^"|"$/g, '')
  } catch {
    return value.replace(/^"|"$/g, '')
  }
}

const mergeHtmlAttr = (
  attrs: string[],
  name: string,
  value: string,
  join: (current: string) => string,
) => {
  const pattern = new RegExp(`\\b${name}="([^"]*)"`)
  const index = attrs.findIndex((attr) => pattern.test(attr))
  if (index === -1) {
    attrs.push(` ${name}="${value}"`)
    return
  }
  attrs[index] = attrs[index].replace(pattern, (_match, current: string) => {
    return `${name}="${join(current)}"`
  })
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', (html, context) => {
    html.head.unshift(`<script>${THEME_SCRIPT}</script>`)

    const event = context?.event
    if (!event) return

    const cookies = parseCookies(event)
    const preference = unwrapCookie(cookies['nuxt-color-mode'])
    const resolved = unwrapCookie(cookies['ns-theme'])
    const dark =
      preference === 'dark' ||
      (preference !== 'light' && resolved === 'dark')
    const light = preference === 'light' || resolved === 'light'

    if (!dark && !light) return

    const themeClass = dark ? 'dark' : 'light'
    mergeHtmlAttr(html.htmlAttrs, 'class', themeClass, (current) => {
      const tokens = new Set(current.split(/\s+/).filter(Boolean))
      tokens.delete(dark ? 'light' : 'dark')
      tokens.add(themeClass)
      return [...tokens].join(' ')
    })
    mergeHtmlAttr(
      html.htmlAttrs,
      'style',
      `color-scheme:${themeClass}`,
      (current) => {
        const next = current
          .replace(/color-scheme\s*:\s*[^;]+;?/gi, '')
          .trim()
          .replace(/;?$/, '')
        return next
          ? `${next}; color-scheme:${themeClass}`
          : `color-scheme:${themeClass}`
      },
    )
  })
})
