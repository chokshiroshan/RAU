-- Universal Window Discovery Script
-- Fast window enumeration using System Events
-- Returns: appName|||windowTitle|||windowId|||pid|||bounds

tell application "System Events"
    set windowList to ""
    
    repeat with proc in every application process
        try
            set appName to name of proc
            set appPID to unix id of proc
            
            -- Skip system processes that won't have meaningful windows
            if appName is not "Window Server" and appName is not "loginwindow" and appName is not "kernel_task" then
                set windowCount to count of windows of proc
                
                repeat with i from 1 to windowCount
                    try
                        set w to window i of proc
                        set winTitle to name of w
                        set winId to id of w
                        
                        -- Skip windows without meaningful titles
                        if winTitle is not missing value and winTitle is not "" then
                            set winBounds to ""
                            try
                                set winPos to position of w
                                set winSize to size of w
                                set winBounds to (item 1 of winPos) as text & "," & (item 2 of winPos) as text & "," & (item 1 of winSize) as text & "," & (item 2 of winSize) as text
                            end try
                            
                            set winInfo to appName & "|||" & winTitle & "|||" & winId & "|||" & appPID & "|||" & winBounds
                            
                            if length of windowList is 0 then
                                set windowList to winInfo
                            else
                                set windowList to windowList & "," & winInfo
                            end if
                        end if
                    on error
                        -- skip problematic windows
                    end try
                end repeat
            end if
        on error
            -- skip problematic processes
        end try
    end repeat
    
    return windowList
end tell