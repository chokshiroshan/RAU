-- @name: Close Duplicate Tabs
-- @description: Closes duplicate tabs in Safari, keeping the first instance of each URL
tell application "Safari"
	activate
	set urlList to {}
	set tabsToClose to {}
	
	repeat with w in windows
		repeat with t in tabs of w
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
end tell