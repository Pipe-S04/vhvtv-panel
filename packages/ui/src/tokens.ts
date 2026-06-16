export const vhvTokens = {
  color: {
    canvas: '#05070d',
    surface: '#0c1018',
    surfaceElevated: '#111620',
    surfaceHover: '#151b27',
    surfaceGlass: 'rgba(17, 22, 32, 0.78)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(59, 130, 246, 0.28)',
    text: '#f7f9fc',
    textMuted: '#8e99aa',
    textSubtle: '#626d7e',
    primary: '#168bff',
    primaryLight: '#38a8ff',
    cyan: '#20d9ff',
    navy: '#080b12',
    ruby: '#ff5263',
    emerald: '#22c787',
    amber: '#f5b942',
    sapphire: '#168bff'
  },
  status: {
    online: '#22c787',
    degraded: '#f5b942',
    offline: '#ff5263',
    unknown: '#8e99aa',
    paused: '#168bff'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem'
  },
  radii: {
    sm: '0.5rem',
    md: '0.875rem',
    lg: '1.25rem',
    xl: '1.75rem',
    pill: '999px'
  },
  shadow: {
    soft: '0 14px 40px rgba(0, 0, 0, 0.28)',
    luxe: '0 20px 60px rgba(0, 0, 0, 0.42), 0 0 42px rgba(22, 139, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    glow: '0 0 0 1px rgba(59, 130, 246, 0.28), 0 0 34px rgba(22, 139, 255, 0.16)',
    focus: '0 0 0 3px rgba(32, 217, 255, 0.24)'
  }
} as const;

export type VhvStatus = keyof typeof vhvTokens.status;
