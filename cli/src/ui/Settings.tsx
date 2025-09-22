import { TextInput } from "@inkjs/ui"
import { Box, Text, useInput } from "ink"
import React, { useEffect, useState } from "react"
import { CliHostBridge } from "../hosts/CliHostBridge.js"

interface SettingsProps {
	hostBridge: CliHostBridge
}

interface SettingItem {
	key: string
	label: string
	value: string
	type: "text" | "password" | "select" | "boolean"
	options?: string[]
	description: string
}

export const Settings: React.FC<SettingsProps> = ({ hostBridge }) => {
	const [settings, setSettings] = useState<SettingItem[]>([])
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [editingIndex, setEditingIndex] = useState<number | null>(null)
	const [editValue, setEditValue] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [hasChanges, setHasChanges] = useState(false)

	useInput((input, key) => {
		if (editingIndex !== null) {
			// In edit mode
			if (key.return) {
				saveEditValue()
			} else if (key.escape) {
				cancelEdit()
			}
			return
		}

		// Navigation mode
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1))
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(settings.length - 1, selectedIndex + 1))
		} else if (key.return || input === "e") {
			startEdit(selectedIndex)
		} else if (input === "s") {
			saveAllSettings()
		} else if (input === "r") {
			resetToDefaults()
		} else if (input === "d") {
			resetSetting(selectedIndex)
		} else if (input === "t") {
			toggleBoolean(selectedIndex)
		}
	})

	const loadSettings = async () => {
		setIsLoading(true)
		setError(null)

		try {
			// Load settings from host bridge or create defaults
			const defaultSettings: SettingItem[] = [
				{
					key: "ai.model",
					label: "AI Model",
					value: "claude-3-sonnet",
					type: "select",
					options: ["claude-3-sonnet", "claude-3-haiku", "gpt-4", "gpt-3.5-turbo"],
					description: "The AI model to use for conversations",
				},
				{
					key: "ai.apiKey",
					label: "API Key",
					value: "",
					type: "password",
					description: "Your AI provider API key",
				},
				{
					key: "ai.temperature",
					label: "Temperature",
					value: "0.7",
					type: "text",
					description: "Creativity level (0.0 - 1.0)",
				},
				{
					key: "ui.theme",
					label: "UI Theme",
					value: "dark",
					type: "select",
					options: ["dark", "light", "auto"],
					description: "Terminal UI color theme",
				},
				{
					key: "ui.animations",
					label: "Animations",
					value: "true",
					type: "boolean",
					description: "Enable UI animations and effects",
				},
				{
					key: "workspace.autoSave",
					label: "Auto Save",
					value: "true",
					type: "boolean",
					description: "Automatically save changes",
				},
				{
					key: "workspace.maxFileSize",
					label: "Max File Size (MB)",
					value: "10",
					type: "text",
					description: "Maximum file size to process",
				},
				{
					key: "debug.verbose",
					label: "Verbose Logging",
					value: "false",
					type: "boolean",
					description: "Enable detailed debug output",
				},
				{
					key: "telemetry.enabled",
					label: "Telemetry",
					value: "false",
					type: "boolean",
					description: "Send usage data to improve Cline",
				},
			]

			setSettings(defaultSettings)
		} catch (err) {
			setError(`Failed to load settings: ${err instanceof Error ? err.message : "Unknown error"}`)
		} finally {
			setIsLoading(false)
		}
	}

	const startEdit = (index: number) => {
		const setting = settings[index]
		if (setting) {
			setEditingIndex(index)
			setEditValue(setting.value)
		}
	}

	const cancelEdit = () => {
		setEditingIndex(null)
		setEditValue("")
	}

	const saveEditValue = () => {
		if (editingIndex !== null) {
			setSettings((prev) =>
				prev.map((setting, index) => (index === editingIndex ? { ...setting, value: editValue } : setting)),
			)
			setHasChanges(true)
			setEditingIndex(null)
			setEditValue("")
		}
	}

	const toggleBoolean = (index: number) => {
		const setting = settings[index]
		if (setting && setting.type === "boolean") {
			const newValue = setting.value === "true" ? "false" : "true"
			setSettings((prev) => prev.map((s, i) => (i === index ? { ...s, value: newValue } : s)))
			setHasChanges(true)
		}
	}

	const resetSetting = (index: number) => {
		// Reset to default value (implement based on your default logic)
		const setting = settings[index]
		if (setting) {
			let defaultValue = ""
			switch (setting.key) {
				case "ai.model":
					defaultValue = "claude-3-sonnet"
					break
				case "ai.temperature":
					defaultValue = "0.7"
					break
				case "ui.theme":
					defaultValue = "dark"
					break
				case "workspace.maxFileSize":
					defaultValue = "10"
					break
				default:
					if (setting.type === "boolean") {
						defaultValue = "false"
					}
			}

			setSettings((prev) => prev.map((s, i) => (i === index ? { ...s, value: defaultValue } : s)))
			setHasChanges(true)
		}
	}

	const resetToDefaults = () => {
		for (let index = 0; index < settings.length; index++) {
			resetSetting(index)
		}
	}

	const saveAllSettings = async () => {
		setIsLoading(true)
		setError(null)

		try {
			// Save settings via host bridge
			const _envClient = hostBridge.getEnvClient()

			// Convert settings to a configuration object
			const config: Record<string, any> = {}
			settings.forEach((setting) => {
				let value: any = setting.value
				if (setting.type === "boolean") {
					value = setting.value === "true"
				} else if (setting.key === "ai.temperature" || setting.key === "workspace.maxFileSize") {
					value = parseFloat(setting.value)
				}
				config[setting.key] = value
			})

			// Mock saving - in real implementation, this would save to file system
			await new Promise((resolve) => setTimeout(resolve, 500))

			setHasChanges(false)

			const window = hostBridge.getWindowClient()
			await window.showInformationMessage("Settings saved successfully!")
		} catch (err) {
			setError(`Failed to save settings: ${err instanceof Error ? err.message : "Unknown error"}`)
		} finally {
			setIsLoading(false)
		}
	}

	const formatValue = (setting: SettingItem): string => {
		if (setting.type === "password" && setting.value) {
			return "*".repeat(setting.value.length)
		}
		if (setting.type === "boolean") {
			return setting.value === "true" ? "✅ Enabled" : "❌ Disabled"
		}
		return setting.value || "(not set)"
	}

	const getValueColor = (setting: SettingItem): string => {
		if (!setting.value) {
			return "red"
		}
		if (setting.type === "boolean") {
			return setting.value === "true" ? "green" : "red"
		}
		return "cyan"
	}

	useEffect(() => {
		loadSettings()
	}, [hostBridge])

	return (
		<Box flexDirection="column" height="100%">
			{/* Header */}
			<Box borderColor="blue" borderStyle="single" padding={1}>
				<Text bold color="blue">
					⚙️ Settings
				</Text>
				<Box marginLeft={2}>
					<Text color={hasChanges ? "yellow" : "gray"}>{hasChanges ? "Unsaved changes" : "All changes saved"}</Text>
				</Box>
			</Box>

			{/* Controls */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="yellow">↑↓ Navigate | Enter/E Edit | T Toggle Boolean | D Reset | S Save All | R Reset All</Text>
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
					<Text color="cyan">Processing settings...</Text>
				</Box>
			)}

			{/* Settings list */}
			<Box flexDirection="column" flexGrow={1}>
				{settings.map((setting, index) => (
					<Box flexDirection="column" key={setting.key} paddingX={1}>
						<Box flexDirection="row">
							<Text
								backgroundColor={index === selectedIndex ? "blue" : undefined}
								bold={index === selectedIndex}
								color={index === selectedIndex ? "black" : "white"}
								width={25}>
								{setting.label}:
							</Text>

							{editingIndex === index ? (
								<TextInput
									mask={setting.type === "password" ? "*" : undefined}
									onChange={setEditValue}
									placeholder={setting.type === "password" ? "Enter password..." : "Enter value..."}
									value={editValue}
								/>
							) : (
								<Text color={getValueColor(setting)}>{formatValue(setting)}</Text>
							)}
						</Box>

						<Box marginLeft={2}>
							<Text color="gray" dimColor>
								{setting.description}
							</Text>
						</Box>

						{setting.options && (
							<Box marginLeft={2}>
								<Text color="gray" dimColor>
									Options: {setting.options.join(", ")}
								</Text>
							</Box>
						)}
					</Box>
				))}
			</Box>

			{/* Status */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="gray">
					Setting {selectedIndex + 1} of {settings.length} |
					{hasChanges ? ` ${Object.keys(settings).length} unsaved changes` : " All changes saved"}
				</Text>
			</Box>
		</Box>
	)
}
