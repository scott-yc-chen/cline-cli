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
	private outputHandler?: (message: string, type?: "info" | "error" | "warning") => void

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
}
