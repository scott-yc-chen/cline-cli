import { TextInput } from "@inkjs/ui"
import { Box, Text, useInput } from "ink"
import React, { useEffect, useRef, useState } from "react"
import { SimplifiedTaskManager } from "../core/SimplifiedTaskManager"
import { CliHostBridge } from "../hosts/CliHostBridge"
import { ClineMessage } from "../types/proto"

interface ChatInterfaceProps {
	initialTask?: string
	model?: string
	apiKey?: string
	apiUrl?: string
	debug?: boolean
	hostBridge: CliHostBridge
}

interface Message {
	id: string
	type: "user" | "assistant" | "system"
	content: string
	timestamp: Date
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
	initialTask,
	model,
	apiKey,
	apiUrl,
	debug = false,
	hostBridge,
}) => {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState("")
	const [isProcessing, setIsProcessing] = useState(false)
	const [taskManager, setTaskManager] = useState<SimplifiedTaskManager | null>(null)
	const [commandHistory, setCommandHistory] = useState<string[]>([])
	const [historyIndex, setHistoryIndex] = useState(-1)
	const [ctrlCCount, setCtrlCCount] = useState(0)
	const inputRef = useRef<any>(null)

	useEffect(() => {
		const initializeTaskManager = async () => {
			// Initialize TaskManager
			const manager = new SimplifiedTaskManager(hostBridge)
			await manager.initialize()

			// Set up callbacks for AI messages
			manager.setMessageCallback((clineMessage: ClineMessage) => {
				const content = clineMessage.text || (clineMessage.type === "say" ? "AI is thinking..." : "Processing...")

				const message: Message = {
					id: Date.now().toString(),
					type: "assistant",
					content,
					timestamp: new Date(),
				}
				setMessages((prev) => [...prev, message])
			})

			setTaskManager(manager)

			// Add welcome message
			const welcomeMessage: Message = {
				id: "welcome",
				type: "system",
				content: `Welcome to Cline CLI! I'm your AI coding assistant.\n${
					model ? `Using model: ${model}` : "No model specified - configure with --model"
				}\n${apiKey ? "API key configured" : "No API key specified - configure with --api-key"}\n\nType your task or question below:`,
				timestamp: new Date(),
			}
			setMessages([welcomeMessage])

			// Process initial task if provided
			if (initialTask) {
				const userMessage: Message = {
					id: Date.now().toString(),
					type: "user",
					content: initialTask,
					timestamp: new Date(),
				}
				setMessages((prev) => [...prev, userMessage])
				await processMessage(initialTask, manager)
			}
		}

		initializeTaskManager().catch((error) => {
			console.error("Failed to initialize TaskManager:", error)
			const errorMessage: Message = {
				id: "error",
				type: "system",
				content: `Error initializing AI system: ${error.message}`,
				timestamp: new Date(),
			}
			setMessages([errorMessage])
		})
	}, [initialTask, model, apiKey, apiUrl, hostBridge])

	// Handle keyboard shortcuts
	useInput((input, key) => {
		// Handle Ctrl+C for exit (need to press twice)
		if (key.ctrl && input === "c") {
			if (ctrlCCount === 0) {
				setCtrlCCount(1)
				// Reset counter after 2 seconds if user doesn't press Ctrl+C again
				setTimeout(() => setCtrlCCount(0), 2000)
				console.log("\nPress Ctrl+C again to exit...")
				return
			} else {
				console.log("\nExiting Cline CLI...")
				process.exit(0)
			}
		}

		// Reset Ctrl+C counter on any other input
		if (ctrlCCount > 0) {
			setCtrlCCount(0)
		}

		// Handle Ctrl+U to clear line to beginning
		if (key.ctrl && input === "u") {
			setInput("")
			setHistoryIndex(-1)
			return
		}

		// Handle up/down arrow keys for command history
		if (key.upArrow && commandHistory.length > 0) {
			const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
			setHistoryIndex(newIndex)
			setInput(commandHistory[newIndex])
			return
		}

		if (key.downArrow && commandHistory.length > 0) {
			if (historyIndex === -1) return

			const newIndex = historyIndex + 1
			if (newIndex >= commandHistory.length) {
				setHistoryIndex(-1)
				setInput("")
			} else {
				setHistoryIndex(newIndex)
				setInput(commandHistory[newIndex])
			}
			return
		}
	})

	const processMessage = async (content: string, manager?: SimplifiedTaskManager) => {
		setIsProcessing(true)

		try {
			const currentManager = manager || taskManager
			if (!currentManager) {
				throw new Error("TaskManager not initialized")
			}

			// Start AI task with the message content
			await currentManager.startTask(content, model, apiKey, apiUrl)
		} catch (error) {
			const errorMessage: Message = {
				id: Date.now().toString(),
				type: "system",
				content: `Error processing message: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			}
			setMessages((prev) => [...prev, errorMessage])
		} finally {
			setIsProcessing(false)
		}
	}

	const handleSubmit = (value: string) => {
		if (!value.trim() || isProcessing) {
			return
		}

		const userMessage: Message = {
			id: Date.now().toString(),
			type: "user",
			content: value,
			timestamp: new Date(),
		}

		setMessages((prev) => [...prev, userMessage])

		// Add command to history if it's not the same as the last command
		if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== value) {
			setCommandHistory((prev) => [...prev, value])
		}

		// Clear input and reset history index
		setInput("")
		setHistoryIndex(-1)
		processMessage(value)
	}

	const getMessageColor = (type: Message["type"]) => {
		switch (type) {
			case "user":
				return "green"
			case "assistant":
				return "blue"
			case "system":
				return "yellow"
			default:
				return "white"
		}
	}

	const getMessagePrefix = (type: Message["type"]) => {
		switch (type) {
			case "user":
				return "👤 You"
			case "assistant":
				return "🤖 Cline"
			case "system":
				return "ℹ️  System"
			default:
				return ""
		}
	}

	return (
		<Box flexDirection="column" flexGrow={1}>
			{/* Messages */}
			<Box flexDirection="column" flexGrow={1} marginBottom={1}>
				{messages.map((message) => (
					<Box flexDirection="column" key={message.id} marginBottom={1}>
						<Text bold color={getMessageColor(message.type)}>
							{getMessagePrefix(message.type)}
						</Text>
						<Text>{message.content}</Text>
						{debug && (
							<Text color="gray" dimColor>
								{message.timestamp.toLocaleTimeString()}
							</Text>
						)}
					</Box>
				))}

				{isProcessing && (
					<Box>
						<Text color="cyan">🤖 Cline is thinking...</Text>
					</Box>
				)}
			</Box>

			{/* Input */}
			<Box borderColor="gray" borderStyle="single" padding={1}>
				<Text color="gray">{"> "}</Text>
				<TextInput
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder={isProcessing ? "Processing..." : "Type your message and press Enter..."}
					value={input}
				/>
			</Box>
		</Box>
	)
}
