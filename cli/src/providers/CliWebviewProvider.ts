import { v4 as uuidv4 } from "uuid"
import { WebviewProvider } from "@/core/webview/WebviewProvider"
import { WebviewProviderType } from "@/shared/webview/types"

/**
 * CLI implementation of WebviewProvider for terminal-based UI state management.
 * Instead of managing HTML webviews, this manages React component state in Ink.
 */
export class CliWebviewProvider extends WebviewProvider {
	private visible = true
	private active = true
	private clientId: string
	private stateUpdateCallback?: (state: any) => void

	constructor(providerType: WebviewProviderType) {
		// Create a minimal context object for CLI environment
		const cliContext = {
			extensionPath: process.cwd(),
			globalState: {
				get: (key: string) => this.getState(key),
				update: (key: string, value: any) => this.setState(key, value),
			},
			subscriptions: [],
		} as any

		super(cliContext, providerType)
		this.clientId = uuidv4()
	}

	/**
	 * Set a callback for state updates from the webview provider
	 */
	setStateUpdateCallback(callback: (state: any) => void): void {
		this.stateUpdateCallback = callback
	}

	/**
	 * Handle messages from the UI components
	 */
	handleMessage(message: any): void {
		// Forward messages to the controller
		if ((this as any).controller) {
			;(this as any).controller.handleWebviewMessage(message)
		}
	}

	/**
	 * Send messages to the UI
	 */
	postMessage(message: any): void {
		if (this.stateUpdateCallback) {
			this.stateUpdateCallback(message)
		}
	}

	// Required abstract method implementations for CLI environment

	getWebviewUrl(path: string): string {
		// In CLI, we don't need actual URLs - return file path
		return `file://${path}`
	}

	getCspSource(): string {
		// CLI doesn't need CSP - return safe default
		return "'self'"
	}

	isVisible(): boolean {
		return this.visible
	}

	setVisible(visible: boolean): void {
		this.visible = visible
	}

	protected isActive(): boolean {
		return this.active
	}

	setActive(active: boolean): void {
		this.active = active
	}

	// CLI-specific state management (replaces VSCode globalState)
	private state = new Map<string, any>()

	private getState(key: string): any {
		return this.state.get(key)
	}

	private setState(key: string, value: any): void {
		this.state.set(key, value)
	}

	getAllState(): Map<string, any> {
		return new Map(this.state)
	}

	/**
	 * Get the client ID for this webview provider
	 */
	getClientId(): string {
		return this.clientId
	}
}
