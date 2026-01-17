-- Simple window discovery
tell application "System Events"
    set windowList to ""
    set appList to {}
    
    repeat with proc in every application process
        try
            set appName to name of proc
            set appPID to unix id of proc
            
            if appName is not "Window Server" and appName is not "loginwindow" then
                set end of appList to {name:appName, pid:appPID}
            end if
        end try
    end repeat
    
    return my processApps(appList)
end tell

on processApps(appList)
    set windowList to ""
    
    repeat with appInfo in appList
        set appName to name of appInfo
        set appPID to pid of appInfo
        
        tell application "System Events"
            tell application process appName
                try
                    set windowCount to count of windows
                    
                    repeat with i from 1 to windowCount
                        try
                            set w to window i
                            set winTitle to name of w
                            
                            if winTitle is not "" then
                                set winInfo to appName & "|||" & winTitle & "|||" & i & "|||" & appPID & "|||"
                                
                                if windowList is "" then
                                    set windowList to winInfo
                                else
                                    set windowList to windowList & "," & winInfo
                                end if
                            end if
                        end try
                    end repeat
                on error
                    -- skip problematic apps
                end try
            end tell
        end tell
    end repeat
    
    return windowList
end processApps