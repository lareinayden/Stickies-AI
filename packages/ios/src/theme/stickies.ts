/**
 * Stickies-inspired color palette and shared styles.
 * Pastel sticky-note colors with paper-like shadows.
 * Apple-inspired typography and spacing system.
 */

export const StickiesColors = {
  // Sticky note backgrounds (main)
  yellow: '#fef9c3',
  yellowDark: '#fef08a',
  pink: '#fce7f3',
  pinkDark: '#fbcfe8',
  blue: '#dbeafe',
  blueDark: '#bfdbfe',
  green: '#dcfce7',
  greenDark: '#bbf7d0',
  orange: '#ffedd5',
  orangeDark: '#fed7aa',
  purple: '#ede9fe',
  purpleDark: '#ddd6fe',
  gray: '#f1f5f9',
  grayDark: '#e2e8f0',

  // Page / surface
  desk: '#fefce8',       // cream paper desk
  deskAlt: '#fffbeb',    // warmer cream

  // Ink
  ink: '#1c1917',
  inkMuted: '#57534e',
  inkLight: '#78716c',

  // Accents (recording uses pink + ink, no bright red)
  success: '#16a34a',
  error: '#b91c1c',
} as const;

/**
 * Apple-inspired typography system
 * Using system fonts with clear hierarchy
 */
export const Typography = {
  // Large titles (screens)
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  // Section titles
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  // Body text
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  bodyEmphasized: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  // Small text
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
    letterSpacing: 0.07,
  },
} as const;

/**
 * Spacing system based on 4px grid
 * Promotes consistent whitespace and minimal cognitive load
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

export const StickiesShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
};

export const StickiesShadowSoft = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

/** Sticky background by task type */
export function stickyColorForTaskType(
  type: 'task' | 'reminder' | 'note'
): string {
  switch (type) {
    case 'reminder':
      return StickiesColors.pink;
    case 'note':
      return StickiesColors.blue;
    default:
      return StickiesColors.yellow;
  }
}

/** Pastel colors for learning areas (same domain = same color) */
const AREA_COLORS = [
  StickiesColors.yellow,
  StickiesColors.pink,
  StickiesColors.blue,
  StickiesColors.green,
  StickiesColors.orange,
  StickiesColors.purple,
] as const;

export function colorForArea(domain: string): string {
  let n = 0;
  for (let i = 0; i < domain.length; i++) {
    n = (n * 31 + domain.charCodeAt(i)) >>> 0;
  }
  return AREA_COLORS[n % AREA_COLORS.length];
}
