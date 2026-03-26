# AutoSort Bookmarks

[中文文档](./README.zh-CN.md)

Save first. Let AI sort bookmarks for you.

AutoSort Bookmarks is an AI-powered browser extension for people who save links fast and organize later. Click once, capture the page context, classify it with your model, and move it into the right folder automatically.

- One click to save and sort the current page
- Uses your own OpenAI-compatible API endpoint and model
- Reuses existing folders and creates missing ones when needed
- Falls back to a pending folder when classification fails

![AutoSort Bookmarks demo](https://github.com/user-attachments/assets/d08ea99f-ab36-4b70-8d29-1b2f318fad29)

## Why AutoSort Bookmarks

Bookmarking usually breaks flow at the exact wrong time. You find something worth saving, then you get stuck deciding:

- Which folder should this go to?
- Should it be a new folder?
- Is this about the topic, the tool, or the project?

AutoSort Bookmarks removes that hesitation. The extension handles classification for you, so saving a page feels instant again.

## How It Works

1. Click the extension icon on the current page.
2. AutoSort Bookmarks creates a bookmark in your browser.
3. It extracts the page title, description, excerpt, and readable content.
4. It sends that context plus your existing bookmark folders to an OpenAI-compatible Chat Completions API.
5. The model returns a target folder path with confidence and a short reason.
6. The bookmark is moved into the selected folder. If something fails, it falls back to a pending folder for manual review.

## Feature Highlights

- One-click bookmark capture from the browser action button.
- AI-based classification using your own API endpoint, API key, and model.
- Reuses existing bookmark folders when they match semantically.
- Creates missing folders automatically when needed.
- Supports up to two levels of bookmark folders.
- Falls back to a configurable pending folder when classification fails.
- Keeps a recent processing log in the management page.
- Lets you retry failed jobs from the settings page.
- Works with both Chrome and Firefox builds.

## Use Cases

- Save research links without interrupting your reading flow.
- Keep project references organized with less manual folder work.
- Build a bookmark habit first, then let AI handle the filing step.
- Route uncertain or low-confidence pages into an inbox for later cleanup.

## Installation

### Option 1: Install from Release Package

- Download the Chrome package: [autosort-bookmarks-0.1.2-chrome.zip](https://github.com/afetmin/AutoSort-Bookmarks/releases/download/v0.1.2/autosort-bookmarks-0.1.2-chrome.zip)
- Download the Firefox package: [autosort-bookmarks-0.1.2-firefox.zip](https://github.com/afetmin/AutoSort-Bookmarks/releases/download/v0.1.2/autosort-bookmarks-0.1.2-firefox.zip)
- Unzip the file.
- Open your browser's extensions page.
- Enable developer mode.
- Load the unpacked extension directory.

### Option 2: Run Locally for Development

```bash
npm install
npm run dev
```

For Firefox:

```bash
npm run dev:firefox
```

## Configuration

Open the extension settings page by right-clicking the extension icon and choosing `Bookmark Settings`.

Required settings:

- `API Endpoint`: any endpoint compatible with the Chat Completions format, for example `https://api.openai.com/v1`
- `API Key`
- `Model`

Optional behavior settings:

- `Pending Folder Name`: where failed classifications are moved

Current defaults in the project:

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Model: `gpt-4o-mini`
- Temperature: `0.2`
- Max captured input: `6000` characters
- Pending folder: `Bookmark Inbox`

## User Flow

### Save a Page

- Open any normal `http` or `https` page.
- Click the AutoSort Bookmarks toolbar icon.
- Wait for the loading state to finish.
- The extension saves the page and moves it into the predicted folder.

### Review Results

- Open the settings page.
- Check recent jobs in the management panel.
- Retry failed jobs if needed.

## Development

### Requirements

- Node.js 22+

### Commands

```bash
# Start development in Chrome
npm run dev

# Start development in Firefox
npm run dev:firefox

# Type check
npm run check

# Production build
npm run build
npm run build:firefox

# Create zip packages
npm run zip
npm run zip:firefox
```

## Tech Stack

- `WXT` for cross-browser extension development
- `Svelte 5` for the options UI
- `@mozilla/readability` for extracting readable page content
- `@wxt-dev/browser` for browser API compatibility
- `TypeScript` for the extension runtime and shared modules

## Project Structure

```text
src/
  entrypoints/
    background.ts      # Extension lifecycle and event wiring
    content.ts         # Page content extraction and in-page toasts
    options/           # Settings and recent job UI
  features/
    action/            # Toolbar icon state and context menu
    bookmarks/         # Bookmark lookup, folder creation, moving
    capture/           # Capture pipeline from active page tabs
    classification/    # Prompting and model response validation
    jobs/              # Recent task history storage
    orchestrator/      # End-to-end bookmark processing flow
    settings/          # Extension settings persistence
```

## Current Scope and Limits

- Classification runs only for regular web pages with `http` or `https` URLs.
- The folder depth is limited to two levels.
- The recent job history keeps the latest 20 records.
- If the original page tab is unavailable, the extension falls back to title-based capture.

## Roadmap

- Customizable bookmark folder hierarchy rules
- Organizing existing bookmarks in bulk

## Contributing

Issues, feature requests, and pull requests are welcome.

## License

MIT
