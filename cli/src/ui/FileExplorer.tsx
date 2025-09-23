import { Box, Text, useInput } from "ink"
import path from "path"
import React, { useEffect, useState } from "react"
import { CliHostBridge } from "../hosts/CliHostBridge"

interface FileExplorerProps {
	hostBridge: CliHostBridge
}

interface FileItem {
	name: string
	path: string
	type: "file" | "directory"
	size?: number
	modified?: Date
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ hostBridge }) => {
	const [currentPath, setCurrentPath] = useState(process.cwd())
	const [files, setFiles] = useState<FileItem[]>([])
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showHidden, setShowHidden] = useState(false)

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1))
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(files.length - 1, selectedIndex + 1))
		} else if (key.return) {
			const selectedFile = files[selectedIndex]
			if (selectedFile && selectedFile.type === "directory") {
				navigateToDirectory(selectedFile.path)
			} else if (selectedFile && selectedFile.type === "file") {
				openFile(selectedFile.path)
			}
		} else if (key.backspace || input === "..") {
			navigateUp()
		} else if (input === "h") {
			setShowHidden(!showHidden)
		} else if (input === "r") {
			loadDirectory(currentPath)
		}
	})

	const navigateToDirectory = async (dirPath: string) => {
		try {
			setCurrentPath(dirPath)
			await loadDirectory(dirPath)
			setSelectedIndex(0)
		} catch (err) {
			setError(`Cannot navigate to ${dirPath}: ${err instanceof Error ? err.message : "Unknown error"}`)
		}
	}

	const navigateUp = () => {
		const parentPath = path.dirname(currentPath)
		if (parentPath !== currentPath) {
			navigateToDirectory(parentPath)
		}
	}

	const loadDirectory = async (dirPath: string) => {
		setIsLoading(true)
		setError(null)

		try {
			const workspace = hostBridge.getWorkspaceClient()
			const entries = await workspace.readDirectory(dirPath)

			const fileItems: FileItem[] = []

			// Add parent directory entry
			if (path.dirname(dirPath) !== dirPath) {
				fileItems.push({
					name: "..",
					path: path.dirname(dirPath),
					type: "directory",
				})
			}

			for (const entry of entries) {
				const itemPath = path.join(dirPath, entry.name)

				// Skip hidden files unless showHidden is true
				if (!showHidden && entry.name.startsWith(".")) {
					continue
				}

				fileItems.push({
					name: entry.name,
					path: itemPath,
					type: entry.type === 1 ? "file" : "directory", // VSCode FileType.File = 1
					size: entry.size,
				})
			}

			// Sort: directories first, then files, alphabetically
			fileItems.sort((a, b) => {
				if (a.name === "..") {
					return -1
				}
				if (b.name === "..") {
					return 1
				}
				if (a.type !== b.type) {
					return a.type === "directory" ? -1 : 1
				}
				return a.name.localeCompare(b.name)
			})

			setFiles(fileItems)
		} catch (err) {
			setError(`Failed to load directory: ${err instanceof Error ? err.message : "Unknown error"}`)
			setFiles([])
		} finally {
			setIsLoading(false)
		}
	}

	const openFile = async (filePath: string) => {
		try {
			const workspace = hostBridge.getWorkspaceClient()
			const content = await workspace.readFile(filePath)

			// For now, just show a preview - in future this could open in a separate view
			const window = hostBridge.getWindowClient()
			await window.showInformationMessage(
				`File: ${path.basename(filePath)}\nSize: ${content.length} bytes\nPath: ${filePath}`,
			)
		} catch (err) {
			setError(`Cannot open file: ${err instanceof Error ? err.message : "Unknown error"}`)
		}
	}

	const formatFileSize = (bytes?: number): string => {
		if (!bytes) {
			return ""
		}
		if (bytes < 1024) {
			return `${bytes}B`
		}
		if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)}KB`
		}
		return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
	}

	const getFileIcon = (file: FileItem): string => {
		if (file.name === "..") {
			return "↖️"
		}
		if (file.type === "directory") {
			return "📁"
		}

		const ext = path.extname(file.name).toLowerCase()
		switch (ext) {
			case ".ts":
			case ".tsx":
				return "🔷"
			case ".js":
			case ".jsx":
				return "💛"
			case ".py":
				return "🐍"
			case ".rs":
				return "🦀"
			case ".go":
				return "🐹"
			case ".json":
				return "📄"
			case ".md":
				return "📝"
			case ".yml":
			case ".yaml":
				return "⚙️"
			case ".txt":
				return "📄"
			case ".png":
			case ".jpg":
			case ".gif":
				return "🖼️"
			default:
				return "📄"
		}
	}

	useEffect(() => {
		loadDirectory(currentPath)
	}, [currentPath, hostBridge])

	return (
		<Box flexDirection="column" height="100%">
			{/* Header */}
			<Box borderColor="blue" borderStyle="single" padding={1}>
				<Text bold color="blue">
					📁 File Explorer
				</Text>
				<Box marginLeft={2}>
					<Text color="gray">{currentPath}</Text>
				</Box>
			</Box>

			{/* Controls */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="yellow">↑↓ Navigate | Enter Open | Backspace Up | H Toggle Hidden | R Refresh</Text>
			</Box>

			{/* Error display */}
			{error && (
				<Box borderColor="red" borderStyle="single" padding={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
			)}

			{/* Loading indicator */}
			{isLoading && (
				<Box padding={1}>
					<Text color="cyan">Loading directory...</Text>
				</Box>
			)}

			{/* File list */}
			<Box flexDirection="column" flexGrow={1}>
				{files.map((file, index) => (
					<Box key={file.path} paddingX={1}>
						<Text
							backgroundColor={index === selectedIndex ? "blue" : undefined}
							bold={index === selectedIndex}
							color={index === selectedIndex ? "black" : file.type === "directory" ? "blue" : "white"}>
							{getFileIcon(file)} {file.name}
							{file.size !== undefined && file.type === "file" && (
								<Text color="gray"> ({formatFileSize(file.size)})</Text>
							)}
						</Text>
					</Box>
				))}
			</Box>

			{/* Status */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="gray">
					{files.length} items | Hidden files: {showHidden ? "shown" : "hidden"}
				</Text>
			</Box>
		</Box>
	)
}
