# Task-Tracker

A desktop task management application for software developers featuring a Kanban workflow, drag-and-drop interface, and AI-powered assistant.

## Download

**[Latest Release (v1.0.0)](https://github.com/ShashankC4/tasktracker/releases/latest)**

## Features

### Project Management
- Create and manage multiple projects
- Drag-and-drop project reordering
- Quick project switching
- Project-specific task views

### Kanban Workflow
- 7-status columns: Not Started, Started, Code Changed, Local Tested, Beta Testing, PR Raised, Prod Deployed
- Drag-and-drop tasks between status columns
- Per-column task counts
- Automatic scroll position memory per project

### Task Management
- Create, edit, and delete tasks
- Priority levels: High, Medium, Low (with visual indicators)
- Blocker field for tracking impediments
- Task descriptions
- Date tracking:
  - Assigned date (manual)
  - Start date (auto-set when moved to Started or beyond, can be edited)
  - End date (auto-set when moved to Prod Deployed, can be edited later)

### Smart Features
- Global task search across all projects
- Scroll-to-task on search result selection
- Smart filtering: Prod Deployed column shows only tasks from last 7 days
- Per-project scroll position memory

### AI Assistant (WorkBuddy)
- Query your tasks using natural language
- Two provider options:
  - OpenRouter (cloud-based, free tier available, use your API key)
  - Ollama (local, private, offline, use your own local model)
- Switchable models and providers
- Conversation history (only in single chat session)
- Collapsible & sidebar

### Interface
- Dark theme inspired by GitHub
- Clean, minimal design
- Responsive layout

## Installation

### Windows

**Option 1: Installer (Recommended)**
1. Download `Task-Tracker_1.0.0_x64_en-US.msi` from [releases](https://github.com/ShashankC4/tasktracker/releases)
2. Run the installer
3. If Windows shows a SmartScreen warning:
   - Click "More info"
   - Click "Run anyway"
4. Launch from Start Menu

**Option 2: Portable**
1. Download `Task-Tracker-v1.0.0.exe` from [releases](https://github.com/ShashankC4/tasktracker/releases)
2. Run directly without installation

### Security Note
This application is self-signed. Windows SmartScreen warnings are expected for indie applications. The source code is fully open and auditable in this repository.

## Getting Started

1. Launch Task-Tracker
2. Create your first project using "+ New Project"
3. Add tasks by clicking "+ Add Task" in any column
4. Drag tasks between columns as you make progress
5. Use the search bar to find tasks across all projects

## AI Setup (Optional)

### OpenRouter (Cloud)
1. Sign up at [OpenRouter](https://openrouter.ai/keys)
2. Get a free API key
3. In Task-Tracker, click the settings icon in WorkBuddy
4. Select "OpenRouter" as provider
5. Paste your API key
6. Choose a free model (default: Arcee Trinity)

### Ollama (Local)
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull qwen2.5:3b`
3. In Task-Tracker, click the settings icon in WorkBuddy
4. Select "Ollama" as provider
5. Enter your model name (e.g., qwen2.5:3b)

## Technology Stack

- Frontend: React 19 + TypeScript
- Desktop Framework: Tauri v2
- Database: SQLite (local file storage)
- Drag & Drop: @dnd-kit
- Styling: Custom CSS with Tailwind base
- AI Integration: OpenRouter API / Ollama local API

## Data Storage

All data is stored locally on your machine:
- Windows: `%APPDATA%\com.user.tasktracker\`
- Database file: `task_tracker.db`

No data is sent to external servers except AI queries when using OpenRouter.

## Development

### Prerequisites
- Node.js 18+
- Rust (for Tauri)

### Setup
```bash
git clone https://github.com/ShashankC4/tasktracker.git
cd task-tracker
npm install
```

### Run Development Server
```bash
npm run tauri dev
```

### Build Production
```bash
npm run tauri build
```

## Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Roadmap

- Task notes for detailed work logs
- Sub tasks

## Support

For bugs and feature requests, please use the [issue tracker](https://github.com/ShashankC4/tasktracker/issues).
