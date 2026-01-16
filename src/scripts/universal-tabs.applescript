set tabOutput to ""

try
    tell application "System Events"
        if exists (processes where name is "Safari") then
            tell application "Safari"
                set winCount to count of windows
                repeat with i from 1 to winCount
                    try
                        set w to window i
                        set tabCount to count of tabs of w
                        repeat with j from 1 to tabCount
                            set t to tab j of w
                            set tabInfo to name of t & "|||" & URL of t & "|||" & i & "|||" & j & "|||Safari"
                            if length of tabOutput > 0 then
                                set tabOutput to tabOutput & ";;;" & tabInfo
                            else
                                set tabOutput to tabInfo
                            end if
                        end repeat
                    end try
                end repeat
            end tell
        end if
    end tell
end try

try
    tell application "System Events"
        if exists (processes where name is "Google Chrome") then
            tell application "Google Chrome"
                set winCount to count of windows
                repeat with i from 1 to winCount
                    try
                        set w to window i
                        set tabCount to count of tabs of w
                        repeat with j from 1 to tabCount
                            set t to tab j of w
                            set tabInfo to title of t & "|||" & URL of t & "|||" & i & "|||" & j & "|||Chrome"
                            if length of tabOutput > 0 then
                                set tabOutput to tabOutput & ";;;" & tabInfo
                            else
                                set tabOutput to tabInfo
                            end if
                        end repeat
                    end try
                end repeat
            end tell
        end if
    end tell
end try

try
    tell application "System Events"
        if exists (processes where name is "Comet") then
            tell application "Comet"
                set winCount to count of windows
                repeat with i from 1 to winCount
                    try
                        set w to window i
                        set tabCount to count of tabs of w
                        repeat with j from 1 to tabCount
                            set t to tab j of w
                            set tabInfo to title of t & "|||" & URL of t & "|||" & i & "|||" & j & "|||Comet"
                            if length of tabOutput > 0 then
                                set tabOutput to tabOutput & ";;;" & tabInfo
                            else
                                set tabOutput to tabInfo
                            end if
                        end repeat
                    end try
                end repeat
            end tell
        end if
    end tell
end try

try
    tell application "System Events"
        if exists (processes where name is "Brave Browser") then
            tell application "Brave Browser"
                set winCount to count of windows
                repeat with i from 1 to winCount
                    try
                        set w to window i
                        set tabCount to count of tabs of w
                        repeat with j from 1 to tabCount
                            set t to tab j of w
                            set tabInfo to title of t & "|||" & URL of t & "|||" & i & "|||" & j & "|||Brave"
                            if length of tabOutput > 0 then
                                set tabOutput to tabOutput & ";;;" & tabInfo
                            else
                                set tabOutput to tabInfo
                            end if
                        end repeat
                    end try
                end repeat
            end tell
        end if
    end tell
end try

try
    tell application "System Events"
        if exists (processes where name is "Arc") then
            tell application "Arc"
                set winCount to count of windows
                repeat with i from 1 to winCount
                    try
                        set w to window i
                        set tabCount to count of tabs of w
                        repeat with j from 1 to tabCount
                            set t to tab j of w
                            set tabInfo to title of t & "|||" & URL of t & "|||" & i & "|||" & j & "|||Arc"
                            if length of tabOutput > 0 then
                                set tabOutput to tabOutput & ";;;" & tabInfo
                            else
                                set tabOutput to tabInfo
                            end if
                        end repeat
                    end try
                end repeat
            end tell
        end if
    end tell
end try

return tabOutput
