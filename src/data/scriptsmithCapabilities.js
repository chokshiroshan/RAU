// ScriptSmith Capabilities Data
// Defines the categories and example prompts for the Explore tab

export const CAPABILITIES = [
  {
    id: 'system',
    name: 'System Controls',
    icon: '🖥️',
    description: 'Control system settings, power, and notifications',
    items: [
      {
        name: 'Toggle Dark Mode',
        prompt: 'Toggle system dark mode',
        description: 'Switch between light and dark appearance'
      },
      {
        name: 'Set Volume',
        prompt: 'Set system volume to 50%',
        description: 'Adjust system output volume'
      },
      {
        name: 'Mute Audio',
        prompt: 'Mute system audio',
        description: 'Mute all system sound'
      },
      {
        name: 'Show Notification',
        prompt: 'Show notification with title "Reminder" and message "Take a break"',
        description: 'Display a system notification'
      },
      {
        name: 'Empty Trash',
        prompt: 'Empty the trash',
        description: 'Empty the system trash bin'
      },
      {
        name: 'Sleep Display',
        prompt: 'Put display to sleep',
        description: 'Turn off the screen without sleeping the system'
      },
      {
        name: 'Lock Screen',
        prompt: 'Lock the screen',
        description: 'Lock the computer immediately'
      }
    ]
  },
  {
    id: 'finder',
    name: 'Finder & Files',
    icon: '📁',
    description: 'Manage files, folders, and Finder windows',
    items: [
      {
        name: 'Open Folder',
        prompt: 'Open Documents folder in new Finder window',
        description: 'Open a specific directory'
      },
      {
        name: 'Create Folder',
        prompt: 'Create folder named "Projects" on Desktop',
        description: 'Create a new directory'
      },
      {
        name: 'Move Files',
        prompt: 'Move selected files to Downloads',
        description: 'Move currently selected files'
      },
      {
        name: 'Reveal Desktop',
        prompt: 'Reveal ~/Desktop in Finder',
        description: 'Show a specific path in Finder'
      },
      {
        name: 'Take Screenshot',
        prompt: 'Take screenshot and save to Desktop',
        description: 'Capture screen to a file'
      },
      {
        name: 'Get File Info',
        prompt: 'Get info for selected files',
        description: 'Show info window for selection'
      }
    ]
  },
  {
    id: 'window',
    name: 'Window Management',
    icon: '🪟',
    description: 'Resize, move, and organize application windows',
    items: [
      {
        name: 'Tile Windows',
        prompt: 'Tile the two frontmost windows side by side',
        description: 'Arrange two windows equally'
      },
      {
        name: 'Resize Window',
        prompt: 'Resize frontmost window to half screen width',
        description: 'Change window dimensions'
      },
      {
        name: 'Center Window',
        prompt: 'Center the frontmost window on screen',
        description: 'Move window to center of display'
      },
      {
        name: 'Minimize All',
        prompt: 'Minimize all windows',
        description: 'Hide all open windows'
      },
      {
        name: 'Close Window',
        prompt: 'Close frontmost window',
        description: 'Close the active window'
      }
    ]
  },
  {
    id: 'browser',
    name: 'Browser Automation',
    icon: '🌐',
    description: 'Control tabs and navigation in Safari, Chrome, Arc',
    items: [
      {
        name: 'Open URL',
        prompt: 'Open github.com in default browser',
        description: 'Navigate to a website'
      },
      {
        name: 'Open Bookmarks',
        prompt: 'Open my top 5 bookmarks in new tabs',
        description: 'Open multiple URLs at once'
      },
      {
        name: 'Close Other Tabs',
        prompt: 'Close all tabs except the current one in Safari',
        description: 'Clean up browser tabs'
      },
      {
        name: 'Copy URL',
        prompt: 'Copy the current Safari tab URL to clipboard',
        description: 'Get current page address'
      },
      {
        name: 'Refresh Page',
        prompt: 'Refresh current browser tab',
        description: 'Reload the active page'
      }
    ]
  },
  {
    id: 'productivity',
    name: 'Productivity Apps',
    icon: '📊',
    description: 'Automate Calendar, Reminders, Notes, and Mail',
    items: [
      {
        name: 'Create Event',
        prompt: 'Create calendar event "Team Meeting" tomorrow at 2pm',
        description: 'Add event to Calendar'
      },
      {
        name: 'Add Reminder',
        prompt: 'Create reminder "Call mom" for today at 5pm',
        description: 'Add item to Reminders'
      },
      {
        name: 'New Note',
        prompt: 'Create new note in Notes app with today\'s date as title',
        description: 'Create a text note'
      },
      {
        name: 'Check Mail',
        prompt: 'Check for new email',
        description: 'Refresh Mail inbox'
      },
      {
        name: 'Compose Email',
        prompt: 'Open new email draft to john@example.com',
        description: 'Start a new email message'
      }
    ]
  },
  {
    id: 'media',
    name: 'Media Control',
    icon: '🎵',
    description: 'Control playback in Music, Spotify, QuickTime',
    items: [
      {
        name: 'Play/Pause',
        prompt: 'Toggle play/pause in Music app',
        description: 'Control media playback'
      },
      {
        name: 'Next Track',
        prompt: 'Skip to next track in Spotify',
        description: 'Go to next song'
      },
      {
        name: 'Set Volume',
        prompt: 'Set Music app volume to 75%',
        description: 'Adjust app-specific volume'
      },
      {
        name: 'Current Song',
        prompt: 'Show notification with current playing song',
        description: 'Get track metadata'
      }
    ]
  },
  {
    id: 'app',
    name: 'App Control',
    icon: '🚀',
    description: 'Launch, quit, and manage applications',
    items: [
      {
        name: 'Launch App',
        prompt: 'Open Visual Studio Code',
        description: 'Start an application'
      },
      {
        name: 'Quit App',
        prompt: 'Quit Safari',
        description: 'Close an application completely'
      },
      {
        name: 'Hide Others',
        prompt: 'Hide all apps except the frontmost',
        description: 'Focus on one application'
      },
      {
        name: 'Switch App',
        prompt: 'Bring Finder to front',
        description: 'Activate a specific app'
      }
    ]
  }
]
