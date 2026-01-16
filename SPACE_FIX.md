# Fixing Space Switching Issue

## Problem
When pressing `Cmd+Shift+Space` while in an app on a non-primary desktop/space, the launcher would:
- Detect the correct monitor ✅
- But switch you to the desktop ❌

## Root Cause
Electron windows activate the parent app when shown, causing macOS to switch spaces to where the app's windows live.

## Solution

### 1. Removed All `focus()` Calls
```javascript
// BEFORE (caused space switching):
mainWindow.focus()

// AFTER (no space switching):
// Just show() without focus()
mainWindow.show()
```

### 2. Changed Window Level
```javascript
// Using 'pop-up-menu' level like Spotlight:
mainWindow.setAlwaysOnTop(true, 'pop-up-menu')
```

This window level:
- Appears on all desktop spaces
- Doesn't activate the parent app
- Floats above all windows
- Just like macOS Spotlight!

### 3. Hide App From Dock
```javascript
if (process.platform === 'darwin') {
  app.dock.hide()
}
```

This prevents macOS from switching to the app's space.

### 4. Added Window Settings
```javascript
{
  acceptFirstMouse: true,      // Respond to clicks without activation
  fullscreenable: false,       // Don't allow fullscreen (prevents space issues)
  skipTaskbar: true,           // Don't show in taskbar/dock
}
```

## Complete Fix

```javascript
// Window creation
mainWindow = new BrowserWindow({
  // ... other settings ...
  skipTaskbar: true,
  show: false,
  fullscreenable: false,
  acceptFirstMouse: true,
})

// macOS specific
if (process.platform === 'darwin') {
  mainWindow.setFullScreenable(false)
  mainWindow.setAlwaysOnTop(true, 'pop-up-menu')  // Key setting!
}

// Hide from dock
app.dock.hide()

// Show WITHOUT focus
mainWindow.show()  // No .focus() call!
```

## Window Levels on macOS

From lowest to highest:
1. `normal` - Regular windows
2. `floating` - Floating palettes
3. `torn-off-menu` - Torn menu items
4. `pop-up-menu` - **Pop-up menus (Spotlight uses this)**
5. `modal-panel` - Modal panels
6. `screen-saver` - Screen savers
7. `dock` - The dock

## Testing

Test these scenarios:

1. **Open app in Comet on Desktop 2**
   - Press Cmd+Shift+Space
   - ✅ Should overlay Comet without switching spaces

2. **Open app in fullscreen on secondary monitor**
   - Press Cmd+Shift+Space
   - ✅ Should appear above fullscreen app

3. **Switch between desktops**
   - Press Cmd+Shift+Space on Desktop 1
   - Switch to Desktop 2
   - Press Cmd+Shift+Space
   - ✅ Should appear on current desktop each time

## Why This Works

The `pop-up-menu` level tells macOS:
- This window belongs to all spaces
- Don't activate the app when showing
- Float above everything
- Respond to keyboard without taking focus

Combined with:
- No `focus()` calls
- Hidden from dock
- `acceptFirstMouse: true`

This creates a true Spotlight-like overlay!
