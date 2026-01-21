# RAU Native Port Implementation Specification

This document provides detailed technical specifications for porting RAU from Electron/React to a native macOS architecture using Swift, AppKit, and XPC services.

## 1. Core Architecture

The application will be split into three distinct components to ensure stability, performance, and security.

### Component Diagram

```mermaid
graph TD
    UI[RAU.app (AppKit UI)] <-->|XPC| Core[com.rau.core.daemon (Mach Service)]
    Core <-->|SQL| DB[(SQLite + FTS5)]
    Ext[Browser Extension] <-->|Native Messaging| Host[rau-host (CLI)]
    Host <-->|Unix Socket| Core
```

| Component | Responsibility | Tech Stack |
|-----------|----------------|------------|
| **RAU.app** | UI rendering, Input handling, Window management | Swift, AppKit, SwiftUI (View layer) |
| **RAUCore** | Indexing, Search execution, LLM, Plugin execution | Swift, SQLite (GRDB), FTS5 |
| **rau-host** | Bridge between Browser Extensions and Core | Swift (CLI), Unix Domain Sockets |

---

## 2. Data Models (Swift)

All models will conform to `Codable`, `Identifiable`, and `Sendable`.

### 2.1 Result Types

```swift
enum ResultType: String, Codable, Sendable {
    case app, tab, file, command, shortcut, plugin, calculator, webSearch, scriptsmith
}

struct SearchResult: Codable, Identifiable, Sendable {
    let id: String
    let type: ResultType
    let title: String
    let subtitle: String?
    let iconPath: String? // Path to cached icon or system symbol name
    let score: Float? // Fuse.js score (lower is better)
    let priority: Float // Tie-breaker priority
    let metadata: ResultMetadata // Type-specific data
}

enum ResultMetadata: Codable, Sendable {
    case app(path: String, bundleId: String?)
    case tab(url: String, browser: String, windowId: Int, tabId: Int)
    case file(path: String)
    case command(actionId: String)
    case shortcut(name: String)
    case plugin(path: String)
    case calculator(expression: String, result: Double)
    case webSearch(url: String)
    case scriptsmith(prompt: String)
}
```

---

## 3. Database Schema (SQLite + FTS5)

We will use **GRDB.swift** for type-safe SQLite access. The database will be located at `~/Library/Application Support/RAU/index.sqlite`.

### 3.1 Tables

```sql
-- Applications
CREATE TABLE apps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    bundleId TEXT,
    keywords TEXT, -- Space-separated keywords from Info.plist
    lastSeen DATETIME,
    launchCount INTEGER DEFAULT 0
);

-- Files (Recursive crawl + FSEvents)
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    extension TEXT,
    parentPath TEXT,
    mtime DATETIME,
    size INTEGER
);

-- Tabs (Synced from browser extensions)
CREATE TABLE tabs (
    id TEXT PRIMARY KEY, -- browser_windowId_tabId
    browser TEXT NOT NULL,
    windowId INTEGER NOT NULL,
    tabId INTEGER NOT NULL,
    title TEXT,
    url TEXT,
    lastActive DATETIME
);

-- Plugins
CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    description TEXT
);
```

### 3.2 FTS5 Virtual Tables (Search Index)

```sql
-- Unified Search Index
CREATE VIRTUAL TABLE search_index USING fts5(
    title,
    subtitle,
    keywords,
    type,
    reference_id UNINDEXED, -- Foreign key to specific table
    tokenize = "unicode61 remove_diacritics 1"
);
```

---

## 4. XPC Protocol Definition

We will use a bidirectional XPC protocol to allow streaming results.

### 4.1 Service Protocol

```swift
@objc protocol RAUCoreXPCProtocol {
    // Search
    func search(query: String, options: SearchOptions, reply: @escaping ([SearchResult]) -> Void)
    
    // Actions
    func activateResult(_ result: SearchResult, reply: @escaping (Bool, String?) -> Void)
    func executeCommand(_ actionId: String, reply: @escaping (Bool, String?) -> Void)
    
    // Indexing Management
    func forceReindex(reply: @escaping (Bool) -> Void)
    func updateSettings(_ settings: Data, reply: @escaping (Bool) -> Void)
    
    // LLM / Scriptsmith
    func generateScript(prompt: String, reply: @escaping (String?, String?) -> Void)
}

@objc protocol SearchOptions: Codable {
    var limit: Int
    var types: [ResultType]
}
```

---

## 5. Ranking Algorithm (Ported Logic)

The ranking logic must strictly match the current `unifiedSearch.js` implementation to preserve the "feel".

### 5.1 Swift Implementation Strategy

We will use a Swift port of Fuse.js (e.g., `Fuse` package) for in-memory ranking of the top candidates returned by FTS5.

**Algorithm Steps:**
1. **Fetch**: Query FTS5 index for top 100 matches using prefix matching (`query*`).
2. **Score**: Run Fuse.js fuzzy matching on these 100 items against the `query` string.
   - Weights: `name: 3.0`, `title: 2.0`, `url: 1.5`, `path: 1.0`
3. **Sort**:
   ```swift
   results.sorted { a, b in
       let scoreDiff = a.score - b.score
       // If scores are very close (0.05 margin), use priority
       if abs(scoreDiff) < 0.05 {
           return a.priority > b.priority
       }
       return a.score < b.score // Lower score is better
   }
   ```
4. **Result Assembly**:
   - Prepend `calculator` result if regex matches `^[\d\s+\-*/().%^]+$`
   - Prepend `scriptsmith` trigger if query starts with `/`
   - Prepend `system commands` that match the query
   - Append `web search` fallback if results are empty

---

## 6. Browser Integration (Extension + Native Host)

We are moving from AppleScript polling to a **Push-based** architecture using Native Messaging.

### 6.1 Native Messaging Host (`rau-host`)

A small Swift CLI tool that:
1. Listens on `stdin` for JSON messages from the browser extension.
2. Forwards tab updates to `RAUCore` via a **Unix Domain Socket** (`/tmp/com.rau.core.sock`).
3. Receives activation commands from `RAUCore` and sends them to `stdout` for the extension.

**Manifest Location**:
- Chrome/Brave/Arc: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rau.tabs.host.json`

### 6.2 Browser Extension (MV3)

**Manifest (`manifest.json`)**:
```json
{
  "manifest_version": 3,
  "name": "RAU Tab Helper",
  "permissions": ["tabs", "nativeMessaging"],
  "background": { "service_worker": "background.js" }
}
```

**Background Script Logic**:
- Listen to `chrome.tabs.onCreated`, `onUpdated`, `onRemoved`, `onActivated`.
- Debounce rapid events (50ms).
- Send diffs to native host: `port.postMessage({ type: 'tab_update', tab: ... })`.

---

## 7. System Commands

Native implementation using `Process` and Apple Events.

| Command | Implementation |
|---------|----------------|
| **Sleep** | `PMSet.sleepNow()` (via IOKit or `pmset` CLI) |
| **Lock** | `SACLockScreenImmediate()` (private framework) or `CGSession -suspend` |
| **Empty Trash** | AppleScript: `tell application "Finder" to empty trash` |
| **Restart/Shutdown** | Apple Event: `AEBuildAppleEvent` (cleaner than osascript) |

---

## 8. LLM Service (Scriptsmith)

### 8.1 Architecture

- **Storage**: API Keys stored securely in **Keychain Services**.
- **Networking**: `URLSession` with strict timeouts (60s).
- **Providers**:
  - `OpenAIProvider`: `api.openai.com/v1/chat/completions`
  - `AnthropicProvider`: `api.anthropic.com/v1/messages`
  - `GoogleProvider`: `generativelanguage.googleapis.com`

### 8.2 Prompt Management
The system prompt currently in `scriptsmithPrompt.js` will be embedded as a static resource string in the `RAUCore` bundle to facilitate easy updates.

---

## 9. Security & Validation

We must port the logic from `validators.js` to Swift `Guard` clauses.

### 9.1 Validation Rules (Swift)

```swift
struct Validators {
    static func validateFilePath(_ path: String) throws -> String {
        guard !path.contains("..") else { throw ValidationError.pathTraversal }
        guard path.count <= 4096 else { throw ValidationError.pathTooLong }
        return (path as NSString).standardizingPath
    }

    static func validatePluginName(_ name: String) throws -> String {
        guard name.hasSuffix(".applescript") else { throw ValidationError.invalidExtension }
        // Regex: ^[\w\s-]+$
        guard name.range(of: "^[\\w\\s-]+$", options: .regularExpression) != nil else {
             throw ValidationError.invalidCharacters
        }
        return name
    }
}
```
