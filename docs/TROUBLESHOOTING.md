# Troubleshooting Guide

This guide covers common issues, debugging techniques, and solutions for ContextSearch problems.

## 🔧 Quick Debugging

### Enable Debug Logging
```bash
# Start with detailed logging
DEBUG=1 npm start
```

This enables verbose logging for:
- `[Window]` - Window lifecycle events
- `[IPC]` - Inter-process communication
- `[TabFetcher]` - Browser tab operations
- `[UnifiedSearch]` - Search orchestration

### Clear All Caches
```bash
# Remove cache files
rm settings.json
npm start
```

### Check Permissions
Go to **System Preferences → Security & Privacy → Privacy** and ensure:
- ✅ **Accessibility**: ContextSearch is checked
- ✅ **Automation**: ContextSearch is checked

## 🚨 Common Issues

### Issue: Hotkey (Cmd+Shift+Space) Doesn't Work

**Symptoms**:
- Pressing Cmd+Shift+Space does nothing
- No error message appears

**Solutions**:

1. **Check for conflicts**:
   - Open **System Preferences → Keyboard → Shortcuts**
   - Look for other apps using Cmd+Shift+Space
   - Change conflicting shortcut

2. **Restart ContextSearch**:
   ```bash
   pkill -f ContextSearch
   npm start
   ```

3. **Check app focus**:
   - Ensure ContextSearch is running (check Activity Monitor)
   - Try focusing the app and then pressing the hotkey

---

### Issue: "Object has been destroyed" Error

**Symptoms**:
- Console shows window destruction errors
- App crashes on repeated hotkey presses

**Solutions**:

1. **This is a known bug** that has been fixed in recent versions
2. **Update to latest version** or apply the fix:
   - The issue was in window recreation logic
   - Fixed by proper `isDestroyed()` checks

**Prevention**:
- Don't manually quit the app while search is active
- Use proper hide/show cycle instead

---

### Issue: Browser Tabs Not Showing

**Symptoms**:
- Search doesn't return any browser tabs
- Only apps and files appear in results

**Solutions**:

1. **Check Permissions**:
   - Go to **System Preferences → Security & Privacy → Privacy → Accessibility**
   - Add ContextSearch if not present
   - Restart ContextSearch after adding permissions

2. **Check Browser Status**:
   - Ensure browser is running
   - Browser must have at least one window open
   - Some browsers require explicit permission granting

3. **Verify Browser Selection**:
   - Press `Cmd+,` to open settings
   - Ensure desired browsers are checked in "Browser Selection"
   - Click "Refresh" to update browser list

4. **Test AppleScript Manually**:
   ```bash
   osascript src/scripts/safari.applescript
   ```
   If this fails, the issue is with AppleScript permissions

---

### Issue: Search Results are Slow

**Symptoms**:
- Noticeable delay between typing and results
- Cursor lag during search

**Solutions**:

1. **Reduce Browser Selection**:
   - Go to settings (`Cmd+,`)
   - Uncheck browsers you don't use frequently
   - Fewer browsers = faster tab fetching

2. **Clear Cache and Restart**:
   ```bash
   rm settings.json
   npm start
   ```

3. **Check Spotlight Index**:
   ```bash
   mdutil -s
   ```
   If Spotlight is reindexing, file searches will be slow

4. **Reduce Search Scope**:
   - In settings, disable categories you don't use
   - Example: Disable file search if you mainly search apps/tabs

---

### Issue: "No Apps Found" or Empty App List

**Symptoms**:
- Onboarding shows no applications
- App search returns no results

**Solutions**:

1. **Check System Integrity**:
   ```bash
   mdfind "kMDItemKind == 'Application'" | head -5
   ```
   If this returns nothing, there's a system issue

2. **Restart Spotlight**:
   ```bash
   sudo mdutil -i off
   sudo mdutil -i on /
   ```

3. **Check App Locations**:
   - Apps should be in `/Applications/` or `/System/Applications/`
   - Apps in other locations may not be indexed

4. **Rebuild Application Cache**:
   ```bash
   rm settings.json
   npm start
   ```

---

### Issue: Icons Not Loading

**Symptoms**:
- Results show without app icons
- Generic document icons instead of app icons

**Solutions**:

1. **Check Permissions**:
   - ContextSearch needs read access to `/Applications/`
   - Ensure no security software is blocking it

2. **Increase Icon Cache Size**:
   - Edit `settings.json`:
   ```json
   {
     "cacheSettings": {
       "maxIconCache": 200
     }
   }
   ```

3. **Clear Icon Cache**:
   ```bash
   rm settings.json
   npm start
   ```

4. **Check Disk Space**:
   - Ensure sufficient disk space for icon extraction
   - Large app bundles may fail to extract icons

---

### Issue: Window Appears on Wrong Monitor

**Symptoms**:
- Search window always appears on primary monitor
- Doesn't follow cursor to active screen

**Solutions**:

1. **Check Multi-Monitor Setup**:
   - Ensure monitors are arranged correctly in System Preferences
   - Try restarting ContextSearch after changing monitor arrangement

2. **Manual Repositioning**:
   - The window should automatically reposition to cursor location
   - If not working, there may be a display detection issue

3. **Test Monitor Detection**:
   ```bash
   # Test Electron screen detection
   DEBUG=1 npm start
   # Look for "[Position]" log messages
   ```

---

### Issue: Memory Usage Increases Over Time

**Symptoms**:
- Activity Monitor shows growing memory usage
- App becomes slower over time

**Solutions**:

1. **Check for Memory Leaks**:
   - Monitor memory usage during searches
   - Look for patterns (specific searches causing issues)

2. **Reduce Cache Sizes**:
   ```json
   {
     "cacheSettings": {
       "appsTTL": 300000,    // 5 minutes instead of 10
       "tabsTTL": 5000,       // 5 seconds instead of 10
       "maxIconCache": 50       // 50 instead of 100
     }
   }
   ```

3. **Regular Restarts**:
   - If issue persists,定期 restart the app
   - This indicates a memory leak that needs fixing

---

### Issue: Accessibility Permission Keeps Resetting

**Symptoms**:
- Keep having to grant Accessibility permission
- Permission disappears after restart

**Solutions**:

1. **Use Correct Permission Path**:
   - **System Preferences → Security & Privacy → Privacy → Accessibility**
   - Drag and drop ContextSearch into the list (don't use + button)

2. **Check Security Settings**:
   - Ensure system security allows third-party apps
   - **System Preferences → Security & Privacy → General**
   - Allow apps downloaded from anywhere

3. **Reinstall App**:
   - Sometimes app signatures get corrupted
   - Rebuild and reinstall: `npm run build && npm start`

---

### Issue: Searches Return "No Results" for Valid Queries

**Symptoms**:
- Searching for known items returns empty results
- Same search works in Spotlight

**Solutions**:

1. **Check Minimum Query Length**:
   - ContextSearch requires at least 2 characters
   - Single character searches are disabled

2. **Check Search Categories**:
   - Press `Cmd+,` to open settings
   - Ensure relevant categories are enabled
   - Example: Enable "Apps" to search for applications

3. **Test Individual Categories**:
   - Search "chrome" - should find Chrome app
   - Search with browser open - should find tabs
   - Search "package.json" - should find files

4. **Check Spotlight Index**:
   ```bash
   mdutil -s
   ```
   If "indexing in progress", wait for completion

---

## 🔍 Advanced Debugging

### Debug Browser Integration

**Test Safari Integration**:
```bash
osascript src/scripts/safari.applescript
```

**Test Chrome Integration**:
```bash
osascript src/scripts/chrome.applescript
```

**Expected Output**:
```
YouTube|||https://youtube.com|||1|||1, GitHub|||https://github.com|||1|||2
```

### Debug IPC Communication

**Enable IPC Logging**:
Add this to renderer console:
```javascript
window.electronAPI.invoke = (channel, ...args) => {
  console.log(`[IPC] → ${channel}:`, args)
  return originalInvoke(channel, ...args)
}
```

### Debug Search Pipeline

**Search Flow Debugging**:
1. Open Chrome DevTools (Cmd+Opt+I)
2. Go to Console tab
3. Type search query
4. Look for:
   - `[UnifiedSearch] Search started`
   - `[AppSearch]`, `[TabFetcher]`, `[FileSearch]` messages
   - Result combination and ranking logs

## 📱 Environment-Specific Issues

### macOS Ventura (13.0+)

**Known Issues**:
- Stricter permission requirements
- New privacy settings may block features

**Solutions**:
- Grant permissions in **System Settings → Privacy & Security**
- Restart app after granting permissions
- Check "Apps with Full Disk Access" if needed

### macOS Sonoma (14.0+)

**Known Issues**:
- New screen recording permissions
- Changed AppleScript security model

**Solutions**:
- Also grant Screen Recording permission
- Restart after permission changes
- Some browsers may need explicit approval

### Multiple Users

**Issues**:
- Settings file location conflicts
- Permission issues between users

**Solutions**:
- Each user needs separate permissions
- Settings stored per-user automatically
- Install app in `/Applications/` for all users

## 📊 Performance Monitoring

### Monitor Memory Usage

```bash
# Watch ContextSearch memory
while true; do
  ps aux | grep -i contextsearch | grep -v grep
  sleep 5
done
```

### Monitor Search Performance

Enable timing in browser console:
```javascript
console.time('search')
// Perform search
console.timeEnd('search')
```

Expected performance:
- **App search**: <50ms (cached)
- **Tab search**: <200ms (per browser)
- **File search**: <500ms (depends on disk)
- **Total search**: <1s (typical case)

## 🆘 Getting Help

### Collect Debug Information

Before reporting issues, collect:

1. **System Information**:
   ```bash
   sw_vers
   system_profiler SPDisplaysDataType
   ```

2. **ContextSearch Version**:
   Check `package.json` version

3. **Debug Logs**:
   ```bash
   DEBUG=1 npm start 2>&1 | tee debug.log
   ```

4. **Settings File**:
   ```bash
   cat settings.json
   ```

### Report Issues

Include in your report:
- macOS version
- ContextSearch version
- Steps to reproduce
- Debug logs
- Screenshots if applicable

### Community Support

- **GitHub Issues**: For bug reports and feature requests
- **Discord**: For real-time help and discussion
- **Documentation**: Check guides before asking questions

---

**Still having issues?** Enable debug mode and share the logs - we'll help you resolve it! 🚀