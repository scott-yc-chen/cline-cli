import { spawn } from "child_process"
import crypto from "crypto"
import os from "os"
import { EnvServiceClientInterface } from "../types/host-bridge-client-types"
import { StreamingCallbacks } from "../types/host-provider-types"
import * as proto from "../types/proto"

/**
 * CLI implementation of EnvService client.
 * Handles system information, clipboard operations, and environment settings.
 */
export class CliEnvClient implements EnvServiceClientInterface {
	private outputHandler?: (message: string, type?: "info" | "error" | "warning") => void
	private machineId?: string
	private telemetrySettings = {
		level: proto.cline.TelemetryLevel.ALL,
		isEnabled: true,
	}

	constructor() {}

	/**
	 * Set output handler for displaying messages
	 */
	setOutputHandler(handler: (message: string, type?: "info" | "error" | "warning") => void): void {
		this.outputHandler = handler
	}

	/**
	 * Display a message in the terminal
	 */
	private displayMessage(message: string, type: "info" | "error" | "warning" = "info"): void {
		if (this.outputHandler) {
			this.outputHandler(message, type)
		} else {
			const prefix = type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️"
			console.log(`${prefix} ${message}`)
		}
	}

	/**
	 * Writes text to clipboard
	 */
	async clipboardWriteText(request: proto.cline.StringRequest): Promise<proto.cline.Empty> {
		try {
			const text = request.value

			// Try different clipboard utilities based on platform
			let clipboardCommand: string[]
			const platform = os.platform()

			if (platform === "darwin") {
				clipboardCommand = ["pbcopy"]
			} else if (platform === "linux") {
				// Try xclip first, then xsel
				if (await this.commandExists("xclip")) {
					clipboardCommand = ["xclip", "-selection", "clipboard"]
				} else if (await this.commandExists("xsel")) {
					clipboardCommand = ["xsel", "--clipboard", "--input"]
				} else {
					throw new Error("No clipboard utility found (install xclip or xsel)")
				}
			} else if (platform === "win32") {
				clipboardCommand = ["clip"]
			} else {
				throw new Error(`Clipboard not supported on platform: ${platform}`)
			}

			await this.executeClipboardCommand(clipboardCommand, text)
			this.displayMessage("📋 Text copied to clipboard")

			return {}
		} catch (error) {
			this.displayMessage(`Error writing to clipboard: ${error}`, "error")
			throw error
		}
	}

	/**
	 * Reads text from clipboard
	 */
	async clipboardReadText(_request: proto.cline.EmptyRequest): Promise<proto.cline.String> {
		try {
			// Try different clipboard utilities based on platform
			let clipboardCommand: string[]
			const platform = os.platform()

			if (platform === "darwin") {
				clipboardCommand = ["pbpaste"]
			} else if (platform === "linux") {
				// Try xclip first, then xsel
				if (await this.commandExists("xclip")) {
					clipboardCommand = ["xclip", "-selection", "clipboard", "-o"]
				} else if (await this.commandExists("xsel")) {
					clipboardCommand = ["xsel", "--clipboard", "--output"]
				} else {
					throw new Error("No clipboard utility found (install xclip or xsel)")
				}
			} else if (platform === "win32") {
				clipboardCommand = ["powershell", "-command", "Get-Clipboard"]
			} else {
				throw new Error(`Clipboard not supported on platform: ${platform}`)
			}

			const clipboardText = await this.readClipboardCommand(clipboardCommand)
			this.displayMessage("📋 Text read from clipboard")

			return { value: clipboardText }
		} catch (error) {
			this.displayMessage(`Error reading from clipboard: ${error}`, "error")
			return { value: "" }
		}
	}

	/**
	 * Gets machine ID (generates a consistent ID based on system info)
	 */
	async getMachineId(_request: proto.cline.EmptyRequest): Promise<proto.cline.String> {
		if (this.machineId) {
			return { value: this.machineId }
		}

		try {
			// Generate a machine ID based on hostname and platform
			const hostname = os.hostname()
			const platform = os.platform()
			const arch = os.arch()
			const release = os.release()

			const machineData = `${hostname}-${platform}-${arch}-${release}`
			this.machineId = crypto.createHash("sha256").update(machineData).digest("hex").slice(0, 32)

			this.displayMessage(`🖥️ Machine ID: ${this.machineId}`)

			return { value: this.machineId }
		} catch (error) {
			this.displayMessage(`Error generating machine ID: ${error}`, "error")
			// Fallback to random ID
			this.machineId = crypto.randomUUID().replace(/-/g, "")
			return { value: this.machineId }
		}
	}

	/**
	 * Gets host version information
	 */
	async getHostVersion(_request: proto.cline.EmptyRequest): Promise<proto.host.GetHostVersionResponse> {
		const packageInfo = await this.getPackageInfo()

		return {
			version: packageInfo.version || "unknown",
			buildNumber: packageInfo.build || "dev",
			hostName: "cline-cli",
		}
	}

	/**
	 * Gets system hostname
	 */
	async getHostname(_request: proto.cline.EmptyRequest): Promise<proto.cline.String> {
		try {
			const hostname = os.hostname()
			this.displayMessage(`🖥️ Hostname: ${hostname}`)
			return { value: hostname }
		} catch (error) {
			this.displayMessage(`Error getting hostname: ${error}`, "error")
			return { value: "unknown" }
		}
	}

	/**
	 * Gets IDE redirect URI (not applicable for CLI)
	 */
	async getIdeRedirectUri(_request: proto.cline.EmptyRequest): Promise<proto.cline.String> {
		return { value: "http://localhost:3000/cli-redirect" } // Placeholder
	}

	/**
	 * Gets telemetry settings
	 */
	async getTelemetrySettings(_request: proto.cline.EmptyRequest): Promise<proto.host.GetTelemetrySettingsResponse> {
		return {
			telemetryLevel: this.telemetrySettings.level,
			isEnabled: this.telemetrySettings.isEnabled,
		}
	}

	/**
	 * Subscribes to telemetry settings changes
	 */
	subscribeToTelemetrySettings(
		_request: proto.cline.EmptyRequest,
		callbacks: StreamingCallbacks<proto.host.TelemetrySettingsEvent>,
	): () => void {
		// In CLI, telemetry settings don't change dynamically
		// Return a no-op unsubscribe function
		this.displayMessage("📊 Subscribed to telemetry settings (CLI mode)")

		// Immediately send current settings
		callbacks.onResponse({
			telemetryLevel: this.telemetrySettings.level,
			isEnabled: this.telemetrySettings.isEnabled,
		})

		if (callbacks.onComplete) {
			callbacks.onComplete()
		}

		// Return unsubscribe function
		return () => {
			this.displayMessage("📊 Unsubscribed from telemetry settings")
		}
	}

	/**
	 * Helper: Execute clipboard write command
	 */
	private async executeClipboardCommand(command: string[], input: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const proc = spawn(command[0], command.slice(1), {
				stdio: ["pipe", "ignore", "pipe"],
			})

			let errorOutput = ""

			proc.stderr?.on("data", (data) => {
				errorOutput += data.toString()
			})

			proc.on("close", (code) => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error(`Clipboard command failed: ${errorOutput}`))
				}
			})

			proc.on("error", reject)

			// Write input to stdin
			proc.stdin?.write(input)
			proc.stdin?.end()
		})
	}

	/**
	 * Helper: Execute clipboard read command
	 */
	private async readClipboardCommand(command: string[]): Promise<string> {
		return new Promise((resolve, reject) => {
			const proc = spawn(command[0], command.slice(1), {
				stdio: ["ignore", "pipe", "pipe"],
			})

			let output = ""
			let errorOutput = ""

			proc.stdout?.on("data", (data) => {
				output += data.toString()
			})

			proc.stderr?.on("data", (data) => {
				errorOutput += data.toString()
			})

			proc.on("close", (code) => {
				if (code === 0) {
					resolve(output)
				} else {
					reject(new Error(`Clipboard command failed: ${errorOutput}`))
				}
			})

			proc.on("error", reject)
		})
	}

	/**
	 * Helper: Check if command exists in PATH
	 */
	private async commandExists(command: string): Promise<boolean> {
		return new Promise((resolve) => {
			const proc = spawn("which", [command], {
				stdio: "ignore",
			})

			proc.on("close", (code) => {
				resolve(code === 0)
			})

			proc.on("error", () => {
				resolve(false)
			})
		})
	}

	/**
	 * Helper: Get package information
	 */
	private async getPackageInfo(): Promise<{ version?: string; build?: string }> {
		try {
			const packageJsonPath = require.resolve("../../../package.json")
			const packageJson = require(packageJsonPath)
			return {
				version: packageJson.version,
				build: process.env.BUILD_NUMBER || "dev",
			}
		} catch {
			return {}
		}
	}
}
