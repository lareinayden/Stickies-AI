/**
 * Stickies-inspired color palette and shared styles.
 * Pastel sticky-note colors with paper-like shadows.
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
