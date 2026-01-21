-- @name: Empty Trash
-- @description: Empties the Trash after user confirmation
tell application "Finder"
    set trashCount to count of items in trash
    if trashCount is 0 then
        display notification "Trash is already empty" with title "Empty Trash"
    else
        set userChoice to display dialog "Are you sure you want to permanently delete " & trashCount & " item(s) from the Trash?" buttons {"Cancel", "Empty Trash"} default button "Cancel" with icon caution
        if button returned of userChoice is "Empty Trash" then
            empty trash
            display notification "Trash has been emptied" with title "Empty Trash"
        end if
    end if
end tell