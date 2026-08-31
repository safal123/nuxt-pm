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

export const colorValue = (id: string) =>
  TASK_COLORS.find((color) => color.id === id)?.value ?? id
