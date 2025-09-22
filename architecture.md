# Cline Architecture and Data Flow

## Layered View

```mermaid
graph TD
    subgraph "VSCode Host"
        HostBridge["Host Bridge (gRPC adapters)"]
        Workspace["Workspace APIs"]
        Window["Window APIs"]
        Terminal["Terminal APIs"]
    end

    subgraph "Extension Runtime"
        Extension["extension.ts Activation"]
        HostProvider["HostProvider Singleton"]
        WebviewProvider["WebviewProvider Instances"]
        Controller["Controller"]
        Task["Task Runtime"]
        Services["Services & Integrations"]
    end

    subgraph "Core Services"
        StateManager["StateManager"]
        MCPHub["MCP Hub"]
        Telemetry["Telemetry & Logging"]
        TerminalMgr["Terminal Manager"]
        Browser["Browser Session"]
        Checkpoints["Checkpoint Manager"]
    end

    subgraph "Webview UI (React)"
        ReactApp["React App"]
        ProtoBus["ProtoBus gRPC Bridge"]
        Components["Chat, MCP, History, Settings"]
    end

    subgraph "External Providers"
        LLMs["LLM Providers (Anthropic, OpenRouter, etc.)"]
        MCPServers["Model Context Protocol Servers"]
        Analytics["PostHog / Telemetry Sinks"]
    end

    HostBridge -->|gRPC| Extension
    Extension --> HostProvider
    HostProvider --> WebviewProvider
    WebviewProvider --> Controller
    Controller --> Task
    Task --> Services
    Services --> CoreServices
    CoreServices --> HostBridge
    WebviewProvider -->|HTML/CSP| ReactApp
    ReactApp --> ProtoBus
    ProtoBus --> Controller
    Task --> LLMs
    MCPHub --> MCPServers
    Telemetry --> Analytics
```

## Component Responsibilities

- **extension.ts** – entry point that wires VS Code activation hooks, registers sidebar/tab webviews, and binds commands to controller actions (`src/extension.ts`).
- **HostProvider** – abstracts host-specific functionality (webview/diff creation, callback URLs, filesystem roots, gRPC clients) so the rest of the codebase stays platform-neutral (`src/hosts/host-provider.ts`).
- **WebviewProvider** – owns individual sidebar/tab instances, creating controllers, serving the React bundle with strict CSP, and tracking active clients (`src/core/webview/WebviewProvider.ts`).
- **Controller** – orchestrates state hydration, auth, MCP hub lifecycle, workspace detection, and mediates between webview messages and the task runtime (`src/core/controller/index.ts`).
- **Task runtime** – coordinates API calls, terminal execution, browser automation, diff generation, checkpoints, and context management during an active task (`src/core/task/index.ts`).
- **Services & integrations** – reusable subsystems for storage, telemetry, auth, globbing, tree-sitter parsing, MCP connections, terminal streaming, etc. (`src/services/**`, `src/integrations/**`).
- **React webview** – renders chat, settings, MCP, history, and account views, exchanging protobuf-encoded messages with the extension via the ProtoBus abstraction (`webview-ui/src/**/*`).

## Data Flow: Task Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Webview as Webview UI (React)
    participant Controller
    participant Task
    participant Services
    participant Host as Host Bridge / VS Code
    participant LLM as LLM & MCP Providers

    User->>Webview: Enter task / approve actions
    Webview->>Controller: gRPC (ProtoBus) message (initTask, commands)
    Controller->>Task: Construct Task with state, services, settings
    Task->>Services: Request context (files, search, MCP)
    Services->>Host: Workspace/diff/terminal calls via HostProvider
    Host-->>Services: Results (file contents, terminal output)
    Task->>LLM: Stream API requests (plan/act)
    LLM-->>Task: Assistant responses/partial messages
    Task->>Webview: Push state updates, plan steps, diffs
    Webview-->>User: Render responses, request approvals
    User->>Webview: Approve/deny edits or commands
    Webview->>Controller: Approval event
    Controller->>Task: Continue or rollback action
    Task->>Host: Apply edits, run commands (with approval)
    Task->>Services: Persist history, checkpoints
    Controller->>Webview: Final status / summaries
```

## Data Flow: Terminal Command Execution

```mermaid
sequenceDiagram
    participant Task
    participant TerminalMgr as TerminalManager
    participant Host as VS Code Terminal
    participant Webview

    Task->>TerminalMgr: runCommand(cmd, cwd)
    TerminalMgr->>Host: Execute via shell integration / sendText
    Host-->>TerminalMgr: Streamed output lines
    TerminalMgr-->>Task: Emit `line` events and resolve promise
    Task->>Webview: Forward output to chat for user approval/visibility
```

## Data Flow: File Editing

```mermaid
sequenceDiagram
    participant Task
    participant DiffProvider as DiffViewProvider
    participant Host as Workspace Service
    participant Webview

    Task->>DiffProvider: Request diff for proposed changes
    DiffProvider->>Host: Create virtual diff via host bridge
    Host-->>DiffProvider: Diff URI
    DiffProvider-->>Task: Diff metadata
    Task->>Webview: Present diff and await approval
    Webview->>Task: Approval / rejection event
    Task->>Host: Apply edits via workspace client when approved
```

## Storage & State Synchronization

- **StateManager** keeps global settings, task configuration, and secrets in memory with debounced persistence to disk, watching for external edits to keep UI state in sync (`src/core/storage/StateManager.ts`).
- **MCP Hub** watches `mcp.json`, validates schema, spins up transports (stdio/SSE/HTTP), and pushes tool/resource updates to controllers via protobuf events (`src/services/mcp/McpHub.ts`).
- **Telemetry Service** aggregates task events, terminal hangs, feature flags, and sends them to PostHog/Sentry, maintaining lifecycle with the controller (`src/services/telemetry`).

## External Integrations

- **LLM Providers** – Anthropic, OpenRouter-compatible APIs, Gemini, Groq, etc., configured via shared `ApiHandler` factories (`src/core/api`).
- **Model Context Protocol** – dynamically discovered tools and resources exposed inside the chat via the MCP Hub (`src/services/mcp`).
- **Analytics & Logging** – PostHog distinct IDs, telemetry events, and error reporting (`src/services/logging`, `src/services/telemetry`).

## Developer Notes

- Build pipeline uses esbuild for the extension bundle and Vite/React for the webview (`esbuild.mjs`, `webview-ui/vite.config.ts`).
- Protobuf definitions under `proto/` are compiled with Buf/ts-proto into shared TypeScript types consumed by both runtime and UI.
- The architecture is host-agnostic: swapping out the HostProvider enables portable environments (VS Code, standalone harness, tests) without touching controller/task logic.
