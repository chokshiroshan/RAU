tell application "Terminal"
    set tabList to ""
    set winCount to count of windows
    repeat with i from 1 to winCount
        set w to window i
        set tabCount to count of tabs of w
        repeat with j from 1 to tabCount
            set t to tab j of w
            -- Use custom title if available, otherwise window name
            set tTitle to custom title of t
            if tTitle is "" then set tTitle to name of w
            
            -- Format: title|||url|||winIdx|||tabIdx
            -- Terminal tabs don't have URLs, so we leave it empty
            set tabInfo to tTitle & "||||||" & i & "|||" & j
            
            if length of tabList > 0 then
                set tabList to tabList & ", " & tabInfo
            else
                set tabList to tabInfo
            end if
        end repeat
    end repeat
    return tabList
end tell
