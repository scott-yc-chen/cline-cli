import { TextInput } from "@inkjs/ui"
import { Box, Text } from "ink"
import React, { useEffect, useState } from "react"
import { CliHostBridge } from "../hosts/CliHostBridge"

interface ChatInterfaceProps {
	initialTask?: string
	model?: string
	debug?: boolean
	hostBridge: CliHostBridge
}

interface Message {
	id: string
	type: "user" | "assistant" | "system"
	content: string
	timestamp: Date
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialTask, model, debug = false, hostBridge: _hostBridge }) => {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState("")
	const [isProcessing, setIsProcessing] = useState(false)

	useEffect(() => {
		// Add welcome message
		const welcomeMessage: Message = {
			id: "welcome",
			type: "system",
			content: `Welcome to Cline CLI! I'm your AI coding assistant.\n${
				model ? `Using model: ${model}` : "No model specified - configure with --model"
			}\n\nType your task or question below:`,
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
			processMessage(initialTask)
		}
	}, [initialTask, model])

	const processMessage = async (content: string) => {
		setIsProcessing(true)

		try {
			// TODO: Integrate with Cline core AI processing
			await new Promise((resolve) => setTimeout(resolve, 1000)) // Temporary delay

			const responseMessage: Message = {
				id: Date.now().toString(),
				type: "assistant",
				content: `I received your message: "${content}"\n\nThis is a placeholder response. The actual AI integration is coming soon!`,
				timestamp: new Date(),
			}

			setMessages((prev) => [...prev, responseMessage])
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
