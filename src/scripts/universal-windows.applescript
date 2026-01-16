-- Universal Window Fetcher
-- Gets windows from ALL visible applications using System Events
-- Returns: appName|||windowTitle|||windowIndex
tell application "System Events"
    set winList to ""
    set appList to every application process whose visible is true
    repeat with theApp in appList
        set appName to name of theApp
        try
            set winIdx to 1
            repeat with w in windows of theApp
                set winName to name of w
                if winName is not "" and winName is not missing value then
                    set winInfo to appName & "|||" & winName & "|||" & winIdx
                    if length of winList > 0 then
                        set winList to winList & ";;;" & winInfo
                    else
                        set winList to winInfo
                    end if
                    set winIdx to winIdx + 1
                end if
            end repeat
        end try
    end repeat
    return winList
end tell
