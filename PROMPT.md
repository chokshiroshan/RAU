# Task: ContextSearch - Phase 2 (Browser Tab Search)

## Prerequisites
- Phase 1 must be complete and working
- All Phase 1 features functional
- No breaking changes to existing code

## Objective
Add browser tab search to existing launcher.
Users can search and jump to open tabs in Safari, Chrome, and Brave.

## Implementation Requirements

### 1. AppleScript Integration
Create AppleScript functions for each browser:

**Safari:**
```applescript
tell application "Safari"
    set tabList to {}
    repeat with w in windows
        repeat with t in tabs of w
            set end of tabList to {name of t, URL of t, index of w, index of t}
        end repeat
    end repeat
    return tabList
end tell
```

**Chrome/Brave:** (similar structure)
```applescript
tell application "Google Chrome"
    set tabList to {}
    repeat with w in windows
        repeat with t in tabs of w
            set end of tabList to {title of t, URL of t, index of w, index of t}
        end repeat
    end repeat
    return tabList
end tell
```

### 2. Tab Fetcher Service
Create `src/services/tabFetcher.js`:
- Function: `getAllTabs()` returns array of tab objects
- Each tab object:
```javascript
  {
    title: "Page Title",
    url: "https://example.com",
    browser: "Safari" | "Chrome" | "Brave",
    windowIndex: 1,
    tabIndex: 3
  }
```
- Execute AppleScript using Node.js child_process
- Parse AppleScript output
- Cache results (refresh every 2 seconds max)
- Handle errors if browser not running

### 3. Tab Activation
Create function to switch to tab:
```javascript
// When user selects a tab result:
// 1. Activate the browser
// 2. Activate the window
// 3. Select the tab
```

Use AppleScript:
```applescript
tell application "Safari"
    activate
    set index of window [windowIndex] to 1
    set current tab of window 1 to tab [tabIndex] of window [windowIndex]
end tell
```

### 4. Update Search Logic
Modify `src/services/fileSearch.js` or create new unified search:
- Search both files AND tabs
- Combine results
- Sort by relevance
- Add result type indicator (file vs tab)

### 5. Update UI
Modify `ResultsList.jsx`:
- Show result type (📄 for files, 🌐 for tabs)
- Display tab URL below title
- Different styling for tabs vs files
- Show browser icon/name

### 6. Keyboard Shortcuts (Optional Enhancement)
- Cmd+T: Show only tabs
- Cmd+F: Show only files
- Default: Show both

## Project Structure Additions
```
context-search/
├── src/
│   ├── services/
│   │   ├── fileSearch.js      (existing)
│   │   ├── tabFetcher.js      (new)
│   │   └── unifiedSearch.js   (new - combines both)
│   └── scripts/
│       ├── safari.applescript (new)
│       ├── chrome.applescript (new)
│       └── brave.applescript  (new)
└── tests/
    └── tabFetcher.test.js     (new)
```

## Success Criteria (ALL must pass)
- [ ] Can list all open Safari tabs
- [ ] Can list all open Chrome tabs (if installed)
- [ ] Can list all open Brave tabs (if installed)
- [ ] Searching "github" finds GitHub tabs
- [ ] Tab results show title + URL
- [ ] Tab results show browser name
- [ ] Selecting tab switches to it correctly
- [ ] Tab search works alongside file search
- [ ] Results show mix of files and tabs
- [ ] Tab fetching handles closed browsers gracefully
- [ ] Cache prevents excessive AppleScript calls
- [ ] Tests pass for tab fetching
- [ ] Tests pass for tab activation
- [ ] No breaking of Phase 1 features
- [ ] No console errors

## Testing Requirements
Add tests for:
1. Tab fetching returns array of tab objects
2. Tab activation AppleScript is correctly formatted
3. Search can find tabs by title
4. Search can find tabs by URL
5. Handles browser not running error

## Performance Notes
- Tab fetching should complete in <100ms
- Cache tab list for 2 seconds
- Don't slow down existing file search

## Error Handling
- If browser not running: skip it, no error
- If AppleScript fails: log error, continue
- If tab activation fails: show user message

## If Stuck After 10 Iterations
Document blocking issues and continue with:
- Implement one browser first (Safari)
- Get that working perfectly
- Then add Chrome/Brave

## Completion Signal
When ALL success criteria met AND tabs work perfectly:
Output exactly: <promise>PHASE2_COMPLETE</promise>