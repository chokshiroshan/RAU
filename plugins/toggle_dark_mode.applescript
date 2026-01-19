-- @name: Toggle Dark Mode
-- @description: Switches between light and dark appearance
tell application "System Events"
    tell appearance preferences
        set dark mode to not dark mode
    end tell
end tell