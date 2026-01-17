-- Document App Template
-- For productivity applications with document-based interfaces
-- Parameters: APP_NAME should be replaced with actual application name

tell application "APP_NAME"
    activate
    set docList to ""
    
    try
        set winCount to count of windows
        repeat with i from 1 to winCount
            set w to window i
            try
                set docName to ""
                set docPath to ""
                
                -- Try to get document information
                try
                    set doc to document 1 of w
                    set docName to name of doc
                    set docPath to path of doc
                    
                    -- Clean up document path (remove file:// prefix if present)
                    if docPath starts with "file://" then
                        set docPath to text 8 thru -1 of docPath
                    end if
                on error
                    -- Fallback to window title
                    try
                        set docName to name of w
                    on error
                        set docName to "Untitled"
                    end try
                end try
                
                -- Skip empty/untitled documents unless they're the only thing
                if docName is "untitled" and winCount > 1 then
                    -- Check if this document has actual content
                    try
                        set doc to document 1 of w
                        set docPath to path of doc
                        -- Only include if it has a path (saved document)
                        if docPath is "" then
                            -- Skip unsaved untitled documents
                            continue repeat
                        end if
                    on error
                        continue repeat
                    end try
                end if
                
                set docInfo to docName & "|||" & docPath & "|||" & i & "|||" & 1 & "|||APP_NAME"
                
                if length of docList > 0 then
                    set docList to docList & "," & docInfo
                else
                    set docList to docInfo
                end if
                
            on error winError
                log "Error processing window " & i & " for APP_NAME: " & winError
            end try
        end repeat
        
    on error appError
        log "Error accessing APP_NAME: " & appError
        set docList to ""
    end try
    
    return docList
end tell