-- @name: Close Duplicate Tabs in Comet
-- @description: Closes duplicate tabs in Comet browser, keeping the first occurrence of each URL

tell application "Comet"
    activate
end tell

delay 0.5

tell application "Comet"
    try
        set urlList to {}
        set tabsToClose to {}
        
        repeat with w in windows
            set tabList to tabs of w
            repeat with t in tabList
                set tabURL to URL of t
                if tabURL is in urlList then
                    set end of tabsToClose to t
                else
                    set end of urlList to tabURL
                end if
            end repeat
        end repeat
        
        repeat with t in tabsToClose
            close t
        end repeat
        
        set dupCount to count of tabsToClose
        if dupCount > 0 then
            display notification "Closed " & dupCount & " duplicate tab(s)" with title "Comet"
        else
            display notification "No duplicate tabs found" with title "Comet"
        end if
        
    on error errMsg
        display dialog "Error closing duplicate tabs: " & errMsg buttons {"OK"} default button 1
    end try
end tell