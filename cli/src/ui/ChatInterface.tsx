import { TextInput } from "@inkjs/ui"
import { Box, Text } from "ink"
import React, { useEffect, useState } from "react"
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
		setInput("")
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
				/>
			</Box>
		</Box>
	)
}
