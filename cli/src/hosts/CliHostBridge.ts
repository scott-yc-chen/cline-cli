import { HostBridgeClientProvider } from "../types/host-provider-types"
import { CliDiffClient } from "./CliDiffClient"
import { CliEnvClient } from "./CliEnvClient"
import { CliWindowClient } from "./CliWindowClient"
import { CliWorkspaceClient } from "./CliWorkspaceClient"

/**
 * CLI implementation of the host bridge client provider.
 * Provides terminal-based implementations of all host services.
 */
export class CliHostBridge implements HostBridgeClientProvider {
	public readonly workspaceClient: CliWorkspaceClient
	public readonly envClient: CliEnvClient
	public readonly windowClient: CliWindowClient
	public readonly diffClient: CliDiffClient

	private cwd: string

	constructor(cwd?: string) {
		this.cwd = cwd || process.cwd()

		this.workspaceClient = new CliWorkspaceClient(this.cwd)
		this.envClient = new CliEnvClient()
		this.windowClient = new CliWindowClient()
		this.diffClient = new CliDiffClient(this.cwd)
	}

	/**
	 * Set output handler for all clients
	 */
	setOutputHandler(handler: (message: string, type?: "info" | "error" | "warning") => void): void {
		this.outputHandler = handler
		this.windowClient.setOutputHandler(handler)
		this.workspaceClient.setOutputHandler(handler)
		this.diffClient.setOutputHandler(handler)
		this.envClient.setOutputHandler(handler)
	}

	/**
	 * Get current working directory
	 */
	getCurrentWorkingDirectory(): string {
		return this.cwd
	}

	/**
	 * Set current working directory
	 */
	setCurrentWorkingDirectory(cwd: string): void {
		this.cwd = cwd
		this.workspaceClient.setCurrentWorkingDirectory(cwd)
		this.diffClient.setCurrentWorkingDirectory(cwd)
	}

	/**
	 * Initialize the host bridge and all clients
	 */
	async initialize(): Promise<void> {
		// Initialize workspace client
		if ("initialize" in this.workspaceClient && typeof this.workspaceClient.initialize === "function") {
			await this.workspaceClient.initialize()
		}

		// Initialize other clients if they have initialization methods
		if ("initialize" in this.envClient && typeof this.envClient.initialize === "function") {
			await this.envClient.initialize()
		}
		if ("initialize" in this.windowClient && typeof this.windowClient.initialize === "function") {
			await this.windowClient.initialize()
		}
		if ("initialize" in this.diffClient && typeof this.diffClient.initialize === "function") {
			await this.diffClient.initialize()
		}
	}

	/**
	 * Get workspace client
	 */
	getWorkspaceClient(): CliWorkspaceClient {
		return this.workspaceClient
	}

	/**
	 * Get environment client
	 */
	getEnvClient(): CliEnvClient {
		return this.envClient
	}

	/**
	 * Get window client
	 */
	getWindowClient(): CliWindowClient {
		return this.windowClient
	}

	/**
	 * Get diff client
	 */
	getDiffClient(): CliDiffClient {
		return this.diffClient
	}
}
