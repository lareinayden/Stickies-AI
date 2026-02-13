/**
 * Haptic feedback utilities for delightful micro-interactions
 * Following Apple's Human Interface Guidelines
 */

import * as Haptics from 'expo-haptics';

/**
 * Light tap feedback for simple interactions
 * Use for: taps, toggles, small confirmations
 */
export const lightImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Medium tap feedback for standard interactions
 * Use for: card flips, button presses, selections
 */
export const mediumImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Heavy tap feedback for important actions
 * Use for: deletions, major state changes, errors
 */
export const heavyImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Rigid tap feedback for snappy interactions
 * Use for: precise selections, slider snaps, picker stops
 */
export const rigidImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
};

/**
 * Soft tap feedback for gentle interactions
 * Use for: subtle changes, background updates
 */
export const softImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
};

/**
 * Success feedback for completed actions
 * Use for: task completion, successful submissions
 */
export const notifySuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Warning feedback for cautionary actions
 * Use for: approaching limits, confirmations needed
 */
export const notifyWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * Error feedback for failed actions
 * Use for: validation errors, failed operations
 */
export const notifyError = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
 * Selection changed feedback for pickers and lists
 * Use for: scrolling through options, changing selections
 */
export const selectionChanged = () => {
  Haptics.selectionAsync();
};

// Convenience aliases for common actions
export const hapticFeedback = {
  // Interactions
  tap: lightImpact,
  press: mediumImpact,
  flip: mediumImpact,
  swipe: rigidImpact,
  longPress: heavyImpact,

  // State changes
  toggle: lightImpact,
  select: selectionChanged,
  delete: heavyImpact,
  complete: notifySuccess,

  // Feedback
  success: notifySuccess,
  warning: notifyWarning,
  error: notifyError,
};
