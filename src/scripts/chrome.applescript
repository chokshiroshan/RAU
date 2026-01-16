tell application "Google Chrome"
    set tabList to ""
    set winCount to count of windows
    repeat with i from 1 to winCount
        set w to window i
        set tabCount to count of tabs of w
        repeat with j from 1 to tabCount
            set t to tab j of w
            set tabInfo to title of t & "|||" & URL of t & "|||" & i & "|||" & j
            if length of tabList > 0 then
                set tabList to tabList & ", " & tabInfo
            else
                set tabList to tabInfo
            end if
        end repeat
    end repeat
    return tabList
end tell
