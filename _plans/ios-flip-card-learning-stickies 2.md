# iOS Flip-Card Learning Stickies — Implementation Plan

## Overview
Build an interactive `FlipCard` UI component for the iOS app that displays Learning Stickies as tap-to-flip cards. The front shows the concept; the back shows definition + example and allows marking a card as **Learned** or **Needs Review**. The Learning Stickies detail view renders these cards in a scrollable grid/list and sorts so **Needs Review** appears first, while **Learned** cards are dimmed (and optionally hideable).

## Goals
- Reusable `FlipCard` component with smooth 3D flip animation (Reanimated).
- Learning Stickies detail screen uses a scrollable grid/list of flip-cards.
- Persist and reflect progress state per card: `needs_review` vs `learned`.
- Ensure ordering: needs-review first; learned dimmed (and optionally hidden via toggle).
- Add unit/component tests for flip interaction and ordering.

## Technical Approach

### Flip animation
- Use `react-native-reanimated` shared value `progress` in \([0,1]\).
- Front rotation: \(0° → 180°\) on Y-axis.
- Back rotation: \(180° → 360°\) on Y-axis.
- Use `perspective` and `backfaceVisibility: 'hidden'` for iOS-like flip.
- Use opacity interpolation to prevent mirrored text around 90°.

### Progress state (Learned / Needs Review)
- Store per-sticky status in `AsyncStorage` under a user-scoped key:
  - Key: `learningStickyProgress:${userId}`
  - Value: JSON object `{ [stickyId: string]: 'needs_review' | 'learned' }`
- Default status when absent: `needs_review`.

### Learning Stickies UI
- In selected-domain detail view, render `FlatList` with `numColumns={2}`.
- Each item renders a `FlipCard`:
  - **Front**: concept
  - **Back**: definition + example + buttons to mark status
- Sorting:
  - Needs Review first, Learned second
  - Stable tie-breaker: `createdAt` desc
- Learned visual treatment:
  - Dim via `opacity` (e.g. 0.45) and/or reduced contrast
  - Optional toggle: Hide Learned

## File Structure
```
packages/ios/
  src/components/FlipCard.tsx
  app/(tabs)/learning-stickies.tsx
  tests/components/FlipCard.test.tsx
  tests/screens/LearningStickiesOrdering.test.tsx (optional)
  jest.setup.js
  jest.config.js (or package.json jest field)
```

## Dependencies
- Already present:
  - `react-native-reanimated`
- Add for tests:
  - `jest`, `jest-expo`
  - `@testing-library/react-native`
  - `@testing-library/jest-native`
  - `react-test-renderer`
  - `@types/jest`

## Implementation Steps
1. Create `FlipCard` component with Reanimated flip on press.
2. Add progress persistence helpers (inline in screen or small helper module).
3. Refactor `LearningStickiesScreen` detail list into a 2-column grid of `FlipCard`s.
4. Add UI controls on back face to mark status; persist and re-sort immediately.
5. Add Jest + RTL setup and tests:
   - Flip toggles front/back
   - Sorting places needs-review before learned
   - Learned cards apply dim styling

## Testing Strategy
- **Unit/component tests** (RTL):
  - FlipCard: renders front by default; press flips to back; press again flips to front.
  - Detail list ordering: given status map, needs-review renders before learned.
- Mock `AsyncStorage` and Reanimated for deterministic behavior.

## Notes
- If we later want a fancier flip (spring, gesture-driven), we can extend `FlipCard` to support pan gestures; for now tap-to-flip is sufficient and testable.

