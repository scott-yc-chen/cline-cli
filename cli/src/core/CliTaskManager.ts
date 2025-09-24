import { Controller } from "@/core/controller/index"
import { StateManager } from "@/core/storage/StateManager"
import { Task } from "@/core/task/index"
import { McpHub } from "@/services/mcp/McpHub"
import { ClineMessage } from "@/shared/ExtensionMessage"
import { HistoryItem } from "@/shared/HistoryItem"
import { CliHostBridge } from "../hosts/CliHostBridge"

/**
 * CLI implementation for managing Task instances and AI interactions.
 * Provides terminal-based AI conversation and task execution capabilities.
 */
export class CliTaskManager {
	private controller: Controller | null = null
	private currentTask: Task | null = null
	private stateManager: StateManager
	private mcpHub: McpHub
	private hostBridge: CliHostBridge
	private taskHistory: HistoryItem[] = []

	// Callbacks for UI updates
	private messageCallback?: (message: ClineMessage) => void
	private historyCallback?: (history: HistoryItem[]) => void

	constructor(hostBridge: CliHostBridge) {
		this.hostBridge = hostBridge
		this.stateManager = new StateManager()
		this.mcpHub = new McpHub()
	}

	/**
	 * Initialize the task manager with CLI context
	 */
	async initialize(): Promise<void> {
		// Create CLI context for Controller
		const cliContext = {
			extensionPath: process.cwd(),
			globalState: {
				get: (key: string) => this.getGlobalState(key),
				update: (key: string, value: any) => this.setGlobalState(key, value),
			},
			subscriptions: [],
		} as any

		// Create controller instance
		this.controller = new Controller(cliContext, "cli-client")

		// Initialize MCP Hub
		await this.mcpHub.initialize()
	}

	/**
	 * Set callback for receiving AI messages
	 */
	setMessageCallback(callback: (message: ClineMessage) => void): void {
		this.messageCallback = callback
	}

	/**
	 * Set callback for history updates
	 */
	setHistoryCallback(callback: (history: HistoryItem[]) => void): void {
		this.historyCallback = callback
	}

	/**
	 * Start a new AI task
	 */
	async startTask(
		userMessage: string,
		model?: string,
		apiKey?: string,
		apiUrl?: string,
		files?: string[],
		images?: string[],
	): Promise<void> {
		if (!this.controller) {
			throw new Error("TaskManager not initialized")
		}

		// Update API configuration if provided
		if (model || apiKey || apiUrl) {
			await this.updateApiConfiguration(model, apiKey, apiUrl)
		}

		// Cancel existing task if running
		if (this.currentTask) {
			await this.cancelCurrentTask()
		}

		// Create new task
		this.currentTask = new Task(
			this.controller,
			this.mcpHub,
			this.updateTaskHistory.bind(this),
			this.postStateToWebview.bind(this),
			this.reinitExistingTaskFromId.bind(this),
			this.cancelTask.bind(this),
			30000, // shellIntegrationTimeout
			true, // terminalReuseEnabled
			1000, // terminalOutputLineLimit
			"bash", // defaultTerminalProfile
			false, // enableCheckpointsSetting
			this.hostBridge.getCurrentWorkingDirectory(),
			this.stateManager,
			undefined, // workspaceManager
			userMessage,
			images,
			files,
		)

		// Start task execution
		await this.currentTask.start()
	}

	/**
	 * Send a message to the current task
	 */
	async sendMessage(message: string): Promise<void> {
		if (!this.currentTask) {
			throw new Error("No active task")
		}

		// Forward message to task
		await this.currentTask.handleWebviewMessage({
			type: "userMessage",
			content: message,
		})
	}

	/**
	 * Get current task status
	 */
	getCurrentTaskStatus(): string {
		if (!this.currentTask) {
			return "No active task"
		}

		return this.currentTask.taskState.toString()
	}

	/**
	 * Cancel the current task
	 */
	async cancelCurrentTask(): Promise<void> {
		if (this.currentTask) {
			await this.currentTask.abort()
			this.currentTask = null
		}
	}

	/**
	 * Get task history
	 */
	getTaskHistory(): HistoryItem[] {
		return [...this.taskHistory]
	}

	// Private helper methods

	private async updateTaskHistory(historyItem: HistoryItem): Promise<HistoryItem[]> {
		this.taskHistory.push(historyItem)

		// Notify UI about history update
		if (this.historyCallback) {
			this.historyCallback([...this.taskHistory])
		}

		return [...this.taskHistory]
	}

	private async postStateToWebview(): Promise<void> {
		// Post current state to UI components
		if (this.messageCallback && this.currentTask) {
			// Extract current conversation state and notify UI
			const messages = this.currentTask.getMessages()
			if (messages.length > 0) {
				const lastMessage = messages[messages.length - 1]
				this.messageCallback(lastMessage)
			}
		}
	}

	private async reinitExistingTaskFromId(taskId: string): Promise<void> {
		// Handle task reinitialization for CLI
		console.log(`Reinitializing task: ${taskId}`)
	}

	private async cancelTask(): Promise<void> {
		if (this.currentTask) {
			await this.currentTask.abort()
			this.currentTask = null
		}
	}

	private async updateApiConfiguration(model?: string, apiKey?: string, apiUrl?: string): Promise<void> {
		if (!this.controller) {
			return
		}

		// Update API configuration through controller
		const currentConfig = await this.controller.getApiConfiguration()
		const updatedConfig = {
			...currentConfig,
			...(model && { apiModelId: model }),
			...(apiKey && { apiKey: apiKey }),
			...(apiUrl && { apiBaseUrl: apiUrl }),
		}

		await this.controller.updateApiConfiguration(updatedConfig)
	}

	// Global state management for CLI
	private globalState = new Map<string, any>()

	private getGlobalState(key: string): any {
		return this.globalState.get(key)
	}

	private setGlobalState(key: string, value: any): void {
		this.globalState.set(key, value)
	}

	/**
	 * Cleanup resources
	 */
	async dispose(): Promise<void> {
		if (this.currentTask) {
			await this.cancelCurrentTask()
		}

		if (this.controller) {
			await this.controller.dispose()
		}

		await this.mcpHub.dispose()
	}
}
