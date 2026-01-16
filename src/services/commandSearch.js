/**
 * Command Search Service
 * Built-in system commands like sleep, lock, restart, etc.
 */

// System command definitions
const SYSTEM_COMMANDS = [
    {
        id: 'sleep',
        name: 'Sleep',
        description: 'Put your Mac to sleep',
        keywords: ['sleep', 'nap', 'rest'],
        icon: '💤',
        action: 'system-sleep',
    },
    {
        id: 'lock',
        name: 'Lock Screen',
        description: 'Lock your screen',
        keywords: ['lock', 'lock screen', 'secure'],
        icon: '🔒',
        action: 'system-lock',
    },
    {
        id: 'trash',
        name: 'Empty Trash',
        description: 'Empty the trash bin',
        keywords: ['empty trash', 'trash', 'bin', 'delete'],
        icon: '🗑️',
        action: 'system-trash',
    },
    {
        id: 'restart',
        name: 'Restart',
        description: 'Restart your Mac',
        keywords: ['restart', 'reboot'],
        icon: '🔄',
        action: 'system-restart',
    },
    {
        id: 'shutdown',
        name: 'Shut Down',
        description: 'Shut down your Mac',
        keywords: ['shutdown', 'shut down', 'power off', 'turn off'],
        icon: '⏻',
        action: 'system-shutdown',
    },
    {
        id: 'logout',
        name: 'Log Out',
        description: 'Log out of your account',
        keywords: ['logout', 'log out', 'sign out'],
        icon: '👋',
        action: 'system-logout',
    },
]

/**
 * Search for system commands matching the query
 * @param {string} query - Search query
 * @returns {Array} Matching commands with type indicator
 */
export function searchCommands(query) {
    if (!query || query.trim().length < 2) {
        return []
    }

    const lowerQuery = query.toLowerCase().trim()

    return SYSTEM_COMMANDS
        .filter(cmd => {
            // Check if any keyword starts with or includes the query
            return cmd.keywords.some(kw =>
                kw.includes(lowerQuery) || lowerQuery.includes(kw)
            ) || cmd.name.toLowerCase().includes(lowerQuery)
        })
        .map(cmd => ({
            ...cmd,
            type: 'command',
            priority: 5, // Higher than apps
        }))
}

/**
 * Get all available commands (for showing in help/discovery)
 * @returns {Array} All system commands
 */
export function getAllCommands() {
    return SYSTEM_COMMANDS.map(cmd => ({
        ...cmd,
        type: 'command',
        priority: 5,
    }))
}

export default {
    searchCommands,
    getAllCommands,
}
