import { Box, Newline, Text, useInput } from "ink"
import React, { useEffect, useState } from "react"
import { CliHostBridge } from "../hosts/CliHostBridge.js"
import { ChatInterface } from "./ChatInterface.js"
import { DiffViewer } from "./DiffViewer.js"
import { FileExplorer } from "./FileExplorer.js"
import { LoadingSpinner } from "./LoadingSpinner.js"
import { Settings } from "./Settings.js"
import { TaskManager } from "./TaskManager.js"

interface AppProps {
	initialTask?: string
	model?: string
	apiKey?: string
	configPath?: string
	debug?: boolean
}

type AppView = "chat" | "files" | "diff" | "tasks" | "settings"

export const App: React.FC<AppProps> = ({ initialTask, model, apiKey: _apiKey, configPath: _configPath, debug = false }) => {
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [_isInitialized, setIsInitialized] = useState(false)
	const [currentView, setCurrentView] = useState<AppView>("chat")
	const [hostBridge, setHostBridge] = useState<CliHostBridge | null>(null)
	const [showHelp, setShowHelp] = useState(false)

	useInput((input, key) => {
		if (key.ctrl && input === "c") {
			process.exit(0)
		}

		if (key.ctrl && input === "h") {
			setShowHelp(!showHelp)
			return
		}

		// Navigation shortcuts
		if (key.ctrl) {
			switch (input) {
				case "1":
					setCurrentView("chat")
					break
				case "2":
					setCurrentView("files")
					break
				case "3":
					setCurrentView("diff")
					break
				case "4":
					setCurrentView("tasks")
					break
				case "5":
					setCurrentView("settings")
					break
			}
		}
	})

	useEffect(() => {
		const initialize = async () => {
			try {
				// Initialize the CLI host bridge and core systems
				const bridge = new CliHostBridge(process.cwd())
				await bridge.initialize()
				setHostBridge(bridge)
				setIsInitialized(true)
				setIsLoading(false)
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error occurred")
				setIsLoading(false)
			}
		}

		initialize()
	}, [])

	if (error) {
		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
				<Newline />
				<Text color="gray">Please check your configuration and try again.</Text>
			</Box>
		)
	}

	if (isLoading) {
		return (
			<Box flexDirection="column">
				<LoadingSpinner text="Initializing Cline CLI..." />
			</Box>
		)
	}

	const renderCurrentView = () => {
		if (!hostBridge) {
			return null
		}

		switch (currentView) {
			case "chat":
				return <ChatInterface debug={debug} hostBridge={hostBridge} initialTask={initialTask} model={model} />
			case "files":
				return <FileExplorer hostBridge={hostBridge} />
			case "diff":
				return <DiffViewer hostBridge={hostBridge} />
			case "tasks":
				return <TaskManager hostBridge={hostBridge} />
			case "settings":
				return <Settings hostBridge={hostBridge} />
			default:
				return null
		}
	}

	const getViewName = (view: AppView) => {
		switch (view) {
			case "chat":
				return "Chat"
			case "files":
				return "Files"
			case "diff":
				return "Diff"
			case "tasks":
				return "Tasks"
			case "settings":
				return "Settings"
		}
	}

	return (
		<Box flexDirection="column" height={process.stdout.rows}>
			{/* Header */}
			<Box borderColor="blue" borderStyle="round" padding={1}>
				<Text bold color="blue">
					🤖 Cline CLI - AI Coding Assistant
				</Text>
				<Box marginLeft={2}>
					<Text color="gray">Model: {model || "Not configured"}</Text>
				</Box>
			</Box>

			{/* Navigation */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Box flexDirection="row" gap={2}>
					{(["chat", "files", "diff", "tasks", "settings"] as AppView[]).map((view, index) => (
						<Text bold={currentView === view} color={currentView === view ? "blue" : "gray"} key={view}>
							{`Ctrl+${index + 1} ${getViewName(view)}`}
						</Text>
					))}
					<Text color="yellow" marginLeft={2}>
						Ctrl+H Help | Ctrl+C Exit
					</Text>
				</Box>
			</Box>

			{/* Help overlay */}
			{showHelp && (
				<Box borderColor="yellow" borderStyle="double" marginBottom={1} padding={1}>
					<Box flexDirection="column">
						<Text bold color="yellow">
							🔄 Keyboard Shortcuts
						</Text>
						<Text>Ctrl+1 - Chat Interface (AI conversation)</Text>
						<Text>Ctrl+2 - File Explorer (browse project files)</Text>
						<Text>Ctrl+3 - Diff Viewer (view and apply changes)</Text>
						<Text>Ctrl+4 - Task Manager (track progress)</Text>
						<Text>Ctrl+5 - Settings (configuration)</Text>
						<Text>Ctrl+H - Toggle this help</Text>
						<Text>Ctrl+C - Exit application</Text>
					</Box>
				</Box>
			)}

			{/* Main content */}
			<Box flexDirection="column" flexGrow={1}>
				{renderCurrentView()}
			</Box>

			{/* Status bar */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="gray">
					Current view: {getViewName(currentView)} | Working directory: {process.cwd()}
				</Text>
			</Box>
		</Box>
	)
}
