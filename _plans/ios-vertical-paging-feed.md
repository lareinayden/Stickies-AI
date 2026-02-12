# iOS Main Feed: Vertical Paging Card View

## Overview
Refactor the Home tab into a vertical paging card feed with liquid transition, mesh gradient backgrounds (Skia), and a bottom FAB for adding notes.

## Requirements
- **Layout**: Vertical paging; each card uses 80% of screen height, 20px border radius.
- **Transition**: Liquid effect — card below scales from 0.9 to 1.0 as user swipes.
- **Backgrounds**: Soft, moving mesh-style gradient per card via React Native Skia Canvas.
- **Navigation**: No top header; transparent FAB at bottom for adding new notes.

## Technical Approach

### Paging
- Use **FlashList** with `pagingEnabled` and `snapToInterval` / `snapToAlignment` for vertical full-height paging (card height = 80% of window).
- Alternative: **FlatList** if FlashList paging is unreliable on Android (use `snapToInterval` + `decelerationRate="fast"`).

### Liquid scale effect
- On scroll, interpolate `scrollOffset` to scale the next card: scale = 0.9 + 0.1 * progress (0 when card is off-screen below, 1 when card is focused).
- Implement via `onScroll` + `Animated` or `react-native-reanimated` to drive scale transform on each card based on position in viewport.

### Card background (Skia)
- New component: `MeshGradientCardBackground` (or `MeshGradientBackground`).
- Use `@shopify/react-native-skia`: `Canvas`, multiple `RadialGradient` or `LinearGradient` nodes with animated positions to create a soft “moving mesh” look.
- Optional: use `useValue` + `useLoop` or `requestAnimationFrame` to subtly move gradient centers over time.

### Feed data
- Unified feed: recent **tasks** and **learning stickies** combined (e.g. by `createdAt`), mapped to a single list of “cards” with a `type: 'task' | 'learning'` and shared height.
- Empty state: single card prompting “Tap + to add”.

### FAB & Add flow
- Transparent (or frosted) FAB fixed at bottom center/bottom-right.
- On press: open **modal** (or push) with current “add” content: Voice / Type segmented control, voice recorder or text input, and “Extract tasks” / “Create learning area” actions.

### Header
- In tabs layout: set `headerShown: false` for the Home (index) screen so the feed is full-screen with no top header.

## File structure
- `packages/ios/src/components/MeshGradientBackground.tsx` — Skia canvas, soft moving gradient.
- `packages/ios/src/components/FeedCard.tsx` — Card wrapper: 80% height, 20px radius, Skia background, optional scale transform for liquid effect.
- `packages/ios/app/(tabs)/index.tsx` — Refactored Home: FlashList (or FlatList) of FeedCards, scroll-driven scale, FAB overlay.
- `packages/ios/app/(tabs)/_layout.tsx` — `headerShown: false` for index.
- Optional: `packages/ios/app/add-note.tsx` or modal in index for add flow (voice/type + actions).

## Dependencies
- `@shopify/react-native-skia` — Canvas and gradients (Expo compatible: `npx expo install @shopify/react-native-skia`).
- `@shopify/flash-list` — Vertical list with paging (install via npm/yarn; confirm Expo 52 compatibility).

## Implementation steps
1. Install Skia and FlashList; add plan to `_plans/`.
2. Implement `MeshGradientBackground` with soft, slowly animated gradients.
3. Implement `FeedCard` (height 80% of window, borderRadius 20, background from Skia, content slot).
4. Implement feed screen: list of feed items (tasks + learning), scroll handler for scale interpolation, FAB.
5. Hide header for Home; add modal/screen for add flow triggered by FAB.
6. Wire feed data (getTasks, getLearningStickies) and sort by date; handle empty state.
