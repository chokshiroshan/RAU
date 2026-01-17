tell application "System Events"
    set windowList to ""
    
    repeat with proc in every application process
        try
            set appName to name of proc
            set appPID to unix id of proc
            
            if appName is not "Window Server" and appName is not "loginwindow" then
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
                    end try
                end tell
            end if
        end try
    end repeat
    
    return windowList
end tell