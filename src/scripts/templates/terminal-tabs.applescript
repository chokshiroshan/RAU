-- Terminal Tab Template
-- For terminal applications with tab/session support
-- Parameters: APP_NAME should be replaced with actual application name

tell application "APP_NAME"
    activate
    set tabList to ""
    
    try
        set winCount to count of windows
        repeat with i from 1 to winCount
            set w to window i
            try
                set tabCount to count of tabs of w
                repeat with j from 1 to tabCount
                    try
                        set t to tab j of w
                        set tabTitle to name of t
                        set workingDir to ""
                        
                        -- Try to get working directory (terminal-specific)
                        try
                            tell t
                                -- For Terminal.app
                                if exists (process 1) then
                                    set procInfo to do shell script "lsof -p " & (unix id of process 1) & " | awk '$4==\"cwd\" {print $9}' | head -1"
                                    if procInfo is not "" then
                                        set workingDir to procInfo
                                    end if
                                end if
                            end tell
                        on error
                            -- Try alternative method for other terminals
                            try
                                set session to session 1 of t
                                if exists (named frame "working directory") then
                                    set workingDir to value of named frame "working directory"
                                end if
                            on error
                                set workingDir to ""
                            end try
                        end try
                        
                        -- Clean up working directory
                        if workingDir starts with "'" and workingDir ends with "'" then
                            set workingDir to text 2 thru -2 of workingDir
                        end if
                        
                        set tabInfo to tabTitle & "|||" & workingDir & "|||" & i & "|||" & j & "|||APP_NAME"
                        
                        if length of tabList > 0 then
                            set tabList to tabList & "," & tabInfo
                        else
                            set tabList to tabInfo
                        end if
                        
                    on error tabError
                        log "Error processing tab " & j & " in window " & i & ": " & tabError
                    end try
                end repeat
                
            on error
                -- Fallback: treat window as single tab
                try
                    set winTitle to name of w
                    set workingDir to ""
                    
                    -- Try to get working directory from the window
                    try
                        if exists (process 1) then
                            set procInfo to do shell script "lsof -p " & (unix id of process 1) & " | awk '$4==\"cwd\" {print $9}' | head -1"
                            if procInfo is not "" then
                                set workingDir to procInfo
                            end if
                        end if
                    on error
                        set workingDir to ""
                    end try
                    
                    set tabInfo to winTitle & "|||" & workingDir & "|||" & i & "|||" & 1 & "|||APP_NAME"
                    
                    if length of tabList > 0 then
                        set tabList to tabList & "," & tabInfo
                    else
                        set tabList to tabInfo
                    end if
                    
                on error winError
                    log "Error processing window " & i & ": " & winError
                end try
            end try
        end repeat
        
    on error appError
        log "Error accessing APP_NAME: " & appError
        set tabList to ""
    end try
    
    return tabList
end tell