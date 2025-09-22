import { diffLines } from "diff"
import fs from "fs/promises"
import path from "path"
import { DiffServiceClientInterface } from "../types/host-bridge-client-types"
import * as proto from "../types/proto"

/**
 * CLI implementation of DiffService client.
 * Handles terminal-based diff viewing, text editing, and document management.
 */
export class CliDiffClient implements DiffServiceClientInterface {
	private cwd: string
	private outputHandler?: (message: string, type?: "info" | "error" | "warning") => void
	private openDocuments: Map<string, string> = new Map() // path -> content

	constructor(cwd: string) {
		this.cwd = cwd
	}

	/**
	 * Set output handler for displaying messages
	 */
	setOutputHandler(handler: (message: string, type?: "info" | "error" | "warning") => void): void {
		this.outputHandler = handler
	}

	/**
	 * Set current working directory
	 */
	setCurrentWorkingDirectory(cwd: string): void {
		this.cwd = cwd
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
	 * Display diff in terminal with colors
	 */
	private displayDiff(oldContent: string, newContent: string, filePath: string): void {
		this.displayMessage(`\n📄 Diff for: ${filePath}`)
		this.displayMessage("─".repeat(60))

		const diff = diffLines(oldContent, newContent)
		let lineNumber = 1

		for (const part of diff) {
			if (part.added) {
				const lines = part.value.split("\n").filter((line) => line !== "")
				for (const line of lines) {
					this.displayMessage(`+ ${lineNumber.toString().padStart(3)}: ${line}`)
					lineNumber++
				}
			} else if (part.removed) {
				const lines = part.value.split("\n").filter((line) => line !== "")
				for (const line of lines) {
					this.displayMessage(`- ${lineNumber.toString().padStart(3)}: ${line}`)
				}
			} else {
				const lines = part.value.split("\n").filter((line, index, arr) => {
					// Keep the line if it's not the last empty line
					return line !== "" || index !== arr.length - 1
				})
				for (const line of lines) {
					this.displayMessage(`  ${lineNumber.toString().padStart(3)}: ${line}`)
					lineNumber++
				}
			}
		}

		this.displayMessage("─".repeat(60))
	}

	/**
	 * Opens diff view between original and modified content
	 */
	async openDiff(request: proto.host.OpenDiffRequest): Promise<proto.host.OpenDiffResponse> {
		try {
			const filePath = this.resolveFilePath(request.path)

			// Read original content
			let originalContent = ""
			try {
				originalContent = await fs.readFile(filePath, "utf-8")
			} catch {
				// File might not exist yet
				originalContent = ""
			}

			// Get new content from request
			const newContent = request.content || ""

			// Store document in memory
			this.openDocuments.set(filePath, newContent)

			// Display the diff
			this.displayDiff(originalContent, newContent, filePath)

			this.displayMessage(`✅ Diff opened for: ${filePath}`)

			return {
				id: filePath, // Use file path as diff ID
				success: true,
			}
		} catch (error) {
			this.displayMessage(`Error opening diff: ${error}`, "error")
			return {
				id: undefined,
				success: false,
			}
		}
	}

	/**
	 * Gets document text content
	 */
	async getDocumentText(request: proto.host.GetDocumentTextRequest): Promise<proto.host.GetDocumentTextResponse> {
		const filePath = this.resolveFilePath(request.path)

		try {
			// Check if we have the document in memory first
			if (this.openDocuments.has(filePath)) {
				const content = this.openDocuments.get(filePath)!
				return { content }
			}

			// Otherwise read from filesystem
			const content = await fs.readFile(filePath, "utf-8")
			return { content }
		} catch (error) {
			this.displayMessage(`Error reading document: ${error}`, "error")
			return { content: "" }
		}
	}

	/**
	 * Replaces text in document
	 */
	async replaceText(request: proto.host.ReplaceTextRequest): Promise<proto.host.ReplaceTextResponse> {
		const filePath = this.resolveFilePath(request.path)

		try {
			// Get current content
			let currentContent = ""
			if (this.openDocuments.has(filePath)) {
				currentContent = this.openDocuments.get(filePath)!
			} else {
				try {
					currentContent = await fs.readFile(filePath, "utf-8")
				} catch {
					// File doesn't exist, start with empty content
					currentContent = ""
				}
			}

			// Apply replacement
			let newContent: string
			if (request.startLine !== undefined && request.endLine !== undefined) {
				// Line-based replacement
				const lines = currentContent.split("\n")
				const startLine = Math.max(0, request.startLine - 1) // Convert to 0-based indexing
				const endLine = Math.min(lines.length, request.endLine) // End is inclusive in the request

				const beforeLines = lines.slice(0, startLine)
				const afterLines = lines.slice(endLine)
				const newLines = request.newText ? request.newText.split("\n") : []

				newContent = [...beforeLines, ...newLines, ...afterLines].join("\n")
			} else {
				// Full content replacement
				newContent = request.newText || ""
			}

			// Update in-memory document
			this.openDocuments.set(filePath, newContent)

			// Display the change
			if (request.startLine !== undefined && request.endLine !== undefined) {
				this.displayMessage(`📝 Replaced lines ${request.startLine}-${request.endLine} in ${filePath}`)
			} else {
				this.displayMessage(`📝 Replaced entire content in ${filePath}`)
			}

			return { success: true }
		} catch (error) {
			this.displayMessage(`Error replacing text: ${error}`, "error")
			return { success: false }
		}
	}

	/**
	 * Scrolls diff view (no-op in CLI, just shows context)
	 */
	async scrollDiff(request: proto.host.ScrollDiffRequest): Promise<proto.host.ScrollDiffResponse> {
		this.displayMessage(`📜 Scroll requested for diff: ${request.diffId}`)
		if (request.lineNumber) {
			this.displayMessage(`   Going to line: ${request.lineNumber}`)
		}

		return { success: true }
	}

	/**
	 * Truncates document to specified number of lines
	 */
	async truncateDocument(request: proto.host.TruncateDocumentRequest): Promise<proto.host.TruncateDocumentResponse> {
		const filePath = this.resolveFilePath(request.path)

		try {
			// Get current content
			let currentContent = ""
			if (this.openDocuments.has(filePath)) {
				currentContent = this.openDocuments.get(filePath)!
			} else {
				currentContent = await fs.readFile(filePath, "utf-8")
			}

			// Truncate to specified lines
			const lines = currentContent.split("\n")
			const truncatedLines = lines.slice(0, request.maxLines || lines.length)
			const truncatedContent = truncatedLines.join("\n")

			// Update in-memory document
			this.openDocuments.set(filePath, truncatedContent)

			this.displayMessage(`✂️ Truncated ${filePath} to ${request.maxLines} lines`)

			return { success: true }
		} catch (error) {
			this.displayMessage(`Error truncating document: ${error}`, "error")
			return { success: false }
		}
	}

	/**
	 * Saves document to filesystem
	 */
	async saveDocument(request: proto.host.SaveDocumentRequest): Promise<proto.host.SaveDocumentResponse> {
		const filePath = this.resolveFilePath(request.path)

		try {
			let content = ""

			if (this.openDocuments.has(filePath)) {
				content = this.openDocuments.get(filePath)!
			} else {
				this.displayMessage(`No in-memory content for ${filePath}, nothing to save`, "warning")
				return { success: false }
			}

			// Ensure directory exists
			const directory = path.dirname(filePath)
			await fs.mkdir(directory, { recursive: true })

			// Write to filesystem
			await fs.writeFile(filePath, content, "utf-8")

			// Remove from in-memory storage after saving
			this.openDocuments.delete(filePath)

			this.displayMessage(`💾 Saved: ${filePath}`)

			return { success: true }
		} catch (error) {
			this.displayMessage(`Error saving document: ${error}`, "error")
			return { success: false }
		}
	}

	/**
	 * Closes all open diffs
	 */
	async closeAllDiffs(request: proto.host.CloseAllDiffsRequest): Promise<proto.host.CloseAllDiffsResponse> {
		const openCount = this.openDocuments.size
		this.openDocuments.clear()

		this.displayMessage(`🚪 Closed ${openCount} open diff documents`)

		return { success: true }
	}

	/**
	 * Opens multi-file diff (shows multiple files in sequence)
	 */
	async openMultiFileDiff(request: proto.host.OpenMultiFileDiffRequest): Promise<proto.host.OpenMultiFileDiffResponse> {
		if (!request.files || request.files.length === 0) {
			this.displayMessage("No files provided for multi-file diff", "warning")
			return { success: false }
		}

		this.displayMessage(`📚 Opening multi-file diff for ${request.files.length} files`)

		for (const fileRequest of request.files) {
			await this.openDiff({
				path: fileRequest.path,
				content: fileRequest.content,
			})
		}

		return { success: true }
	}

	/**
	 * Resolve relative file paths to absolute paths
	 */
	private resolveFilePath(filePath: string): string {
		if (path.isAbsolute(filePath)) {
			return filePath
		}
		return path.resolve(this.cwd, filePath)
	}
}
