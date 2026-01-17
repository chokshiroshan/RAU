-- IDE Tab Template
-- For applications with tab-based interfaces and document support
-- Parameters: APP_NAME should be replaced with actual application name

tell application "APP_NAME"
    activate
    set tabList to ""
    
    try
        set winCount to count of windows
        repeat with i from 1 to winCount
            set w to window i
            try
                -- Try to get tab group (works for VS Code, Sublime Text, etc.)
                set tabGroup to tab group 1 of w
                set tabCount to count of tabs of tabGroup
                
                repeat with j from 1 to tabCount
                    try
                        set t to tab j of tabGroup
                        set docName to name of t
                        set docPath to ""
                        
                        -- Try to get document path
                        try
                            set doc to document 1 of t
                            set docPath to path of doc
                        on error
                            -- Fallback: try to get document from window
                            try
                                set doc to document 1 of w
                                set docPath to path of doc
                            on error
                                set docPath to ""
                            end try
                        end try
                        
                        -- Clean up document path (remove file:// prefix if present)
                        if docPath starts with "file://" then
                            set docPath to text 8 thru -1 of docPath
                        end if
                        
                        set tabInfo to docName & "|||" & docPath & "|||" & i & "|||" & j & "|||APP_NAME"
                        
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
                -- Fallback: treat window as single document
                try
                    set winTitle to name of w
                    set docPath to ""
                    
                    -- Try to get document path
                    try
                        set doc to document 1 of w
                        set docPath to path of doc
                        if docPath starts with "file://" then
                            set docPath to text 8 thru -1 of docPath
                        end if
                    on error
                        set docPath to ""
                    end try
                    
                    set tabInfo to winTitle & "|||" & docPath & "|||" & i & "|||" & 1 & "|||APP_NAME"
                    
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