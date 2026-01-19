# Removed Features

This document archives the implementation details of features that were removed from the codebase but might be useful for future reference.

## Follow Mouse Window Positioning

**Removed:** January 2026
**File:** `electron/main-process/modules/windowManager.js`

This feature allowed the window to appear centered on the mouse cursor instead of the screen center.

### Implementation Details

In `repositionWindow()` and `createWindow()`:

```javascript
const cursorPosition = screen.getCursorScreenPoint()
const activeDisplay = screen.getDisplayNearestPoint(cursorPosition)
const { width, height } = activeDisplay.workAreaSize
const { x: displayX, y: displayY } = activeDisplay.workArea
const { height: screenHeight, y: screenY } = activeDisplay.bounds

// ...

if (position === 'mouse') {
  // Follow mouse: Center on mouse cursor (clamped to screen bounds)
  x = Math.round(cursorPosition.x - (WINDOW_WIDTH / 2))
  y = Math.round(cursorPosition.y - (WINDOW_HEIGHT_COLLAPSED / 2))

  // Clamp to display bounds
  x = Math.max(displayX, Math.min(x, displayX + width - WINDOW_WIDTH))
  y = Math.max(displayY, Math.min(y, displayY + height - WINDOW_HEIGHT_COLLAPSED))
}
```

### Context for Future Use
The user expressed interest in potentially using this "follow mouse" approach for another feature in the future. The core logic involves:
1. Getting `screen.getCursorScreenPoint()`.
2. Calculating centering coordinates based on window dimensions.
3. Clamping the coordinates to `activeDisplay.workArea` or `activeDisplay.bounds` to ensure the window remains fully visible on screen.
