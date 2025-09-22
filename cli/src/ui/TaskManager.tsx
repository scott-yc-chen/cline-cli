import { Box, Text, useInput } from "ink"
import React, { useState } from "react"
import { CliHostBridge } from "../hosts/CliHostBridge.js"

interface TaskManagerProps {
	hostBridge: CliHostBridge
}

interface Task {
	id: string
	title: string
	description: string
	status: "pending" | "in_progress" | "completed" | "failed"
	progress: number // 0-100
	startTime?: Date
	endTime?: Date
	error?: string
	subtasks?: Task[]
}

interface TaskStep {
	id: string
	name: string
	completed: boolean
	error?: string
}

export const TaskManager: React.FC<TaskManagerProps> = ({ hostBridge: _hostBridge }) => {
	const [tasks, setTasks] = useState<Task[]>([])
	const [selectedTaskIndex, setSelectedTaskIndex] = useState(0)
	const [selectedSubtaskIndex, setSelectedSubtaskIndex] = useState(0)
	const [viewMode, setViewMode] = useState<"list" | "detail">("list")
	const [showCompleted, setShowCompleted] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	useInput((input, key) => {
		if (viewMode === "list") {
			if (key.upArrow) {
				setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1))
			} else if (key.downArrow) {
				setSelectedTaskIndex(Math.min(tasks.length - 1, selectedTaskIndex + 1))
			} else if (key.return) {
				if (tasks[selectedTaskIndex]) {
					setViewMode("detail")
					setSelectedSubtaskIndex(0)
				}
			} else if (input === "c") {
				clearCompletedTasks()
			} else if (input === "t") {
				setShowCompleted(!showCompleted)
			} else if (input === "n") {
				createSampleTask()
			} else if (input === "s") {
				stopTask(selectedTaskIndex)
			}
		} else if (viewMode === "detail") {
			const currentTask = tasks[selectedTaskIndex]
			if (currentTask && currentTask.subtasks) {
				if (key.upArrow) {
					setSelectedSubtaskIndex(Math.max(0, selectedSubtaskIndex - 1))
				} else if (key.downArrow) {
					setSelectedSubtaskIndex(Math.min(currentTask.subtasks.length - 1, selectedSubtaskIndex + 1))
				}
			}
			if (key.escape || input === "q") {
				setViewMode("list")
			} else if (input === "s") {
				stopTask(selectedTaskIndex)
			}
		}

		// Global shortcuts
		if (input === "r") {
			refreshTasks()
		}
	})

	const createSampleTask = () => {
		const newTask: Task = {
			id: `task-${Date.now()}`,
			title: "Sample AI Task",
			description: "Implement a new feature with multiple steps",
			status: Math.random() > 0.5 ? "in_progress" : "pending",
			progress: Math.floor(Math.random() * 100),
			startTime: new Date(),
			subtasks: [
				{
					id: "subtask-1",
					title: "Analyze requirements",
					description: "Understanding the task requirements",
					status: "completed",
					progress: 100,
					startTime: new Date(Date.now() - 60000),
					endTime: new Date(Date.now() - 30000),
				},
				{
					id: "subtask-2",
					title: "Generate code",
					description: "Creating the implementation",
					status: "in_progress",
					progress: 65,
					startTime: new Date(Date.now() - 30000),
				},
				{
					id: "subtask-3",
					title: "Write tests",
					description: "Creating unit tests for the implementation",
					status: "pending",
					progress: 0,
				},
			],
		}

		setTasks((prev) => [...prev, newTask])
	}

	const stopTask = (index: number) => {
		setTasks((prev) =>
			prev.map((task, i) =>
				i === index && task.status === "in_progress"
					? { ...task, status: "failed", error: "Task stopped by user" }
					: task,
			),
		)
	}

	const clearCompletedTasks = () => {
		setTasks((prev) => prev.filter((task) => task.status !== "completed"))
		setSelectedTaskIndex(0)
	}

	const refreshTasks = () => {
		// Simulate refreshing tasks from the host bridge
		setIsLoading(true)
		setTimeout(() => {
			setIsLoading(false)
		}, 500)
	}

	const getStatusIcon = (status: Task["status"]): string => {
		switch (status) {
			case "pending":
				return "⏳"
			case "in_progress":
				return "🔄"
			case "completed":
				return "✅"
			case "failed":
				return "❌"
			default:
				return "❓"
		}
	}

	const getStatusColor = (status: Task["status"]): string => {
		switch (status) {
			case "pending":
				return "yellow"
			case "in_progress":
				return "blue"
			case "completed":
				return "green"
			case "failed":
				return "red"
			default:
				return "gray"
		}
	}

	const formatDuration = (startTime?: Date, endTime?: Date): string => {
		if (!startTime) {
			return ""
		}
		const end = endTime || new Date()
		const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000)

		if (duration < 60) {
			return `${duration}s`
		}
		if (duration < 3600) {
			return `${Math.floor(duration / 60)}m ${duration % 60}s`
		}
		return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
	}

	const getProgressBar = (progress: number): string => {
		const width = 20
		const filled = Math.floor((progress / 100) * width)
		const empty = width - filled
		return "█".repeat(filled) + "░".repeat(empty)
	}

	const filteredTasks = showCompleted ? tasks : tasks.filter((task) => task.status !== "completed")

	if (viewMode === "list") {
		return (
			<Box flexDirection="column" height="100%">
				{/* Header */}
				<Box borderColor="blue" borderStyle="single" padding={1}>
					<Text bold color="blue">
						⚡ Task Manager
					</Text>
					<Box marginLeft={2}>
						<Text color="gray">{filteredTasks.length} tasks</Text>
					</Box>
				</Box>

				{/* Controls */}
				<Box borderColor="gray" borderStyle="single" paddingX={1}>
					<Text color="yellow">
						↑↓ Navigate | Enter Detail | N New | S Stop | C Clear Completed | T Toggle Completed | R Refresh
					</Text>
				</Box>

				{/* Loading indicator */}
				{isLoading && (
					<Box padding={1}>
						<Text color="cyan">Refreshing tasks...</Text>
					</Box>
				)}

				{/* Task list */}
				<Box flexDirection="column" flexGrow={1}>
					{filteredTasks.length === 0 ? (
						<Box padding={1}>
							<Text color="gray">No tasks available. Press 'N' to create a sample task.</Text>
						</Box>
					) : (
						filteredTasks.map((task, index) => (
							<Box flexDirection="column" key={task.id} paddingX={1}>
								<Text
									backgroundColor={index === selectedTaskIndex ? "blue" : undefined}
									bold={index === selectedTaskIndex}
									color={index === selectedTaskIndex ? "black" : getStatusColor(task.status)}>
									{getStatusIcon(task.status)} {task.title}
								</Text>
								<Box marginLeft={2}>
									<Text color="gray">
										{task.description} | Progress: {task.progress}%
									</Text>
								</Box>
								<Box marginLeft={2}>
									<Text color="gray">
										{getProgressBar(task.progress)} {task.progress}%
									</Text>
								</Box>
								{task.error && (
									<Box marginLeft={2}>
										<Text color="red">Error: {task.error}</Text>
									</Box>
								)}
							</Box>
						))
					)}
				</Box>

				{/* Status */}
				<Box borderColor="gray" borderStyle="single" paddingX={1}>
					<Text color="gray">
						Active: {tasks.filter((t) => t.status === "in_progress").length} | Pending:{" "}
						{tasks.filter((t) => t.status === "pending").length} | Completed:{" "}
						{tasks.filter((t) => t.status === "completed").length} | Failed:{" "}
						{tasks.filter((t) => t.status === "failed").length}
					</Text>
				</Box>
			</Box>
		)
	}

	// Detail view
	const currentTask = filteredTasks[selectedTaskIndex]
	if (!currentTask) {
		return (
			<Box padding={1}>
				<Text color="red">No task selected</Text>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" height="100%">
			{/* Header */}
			<Box borderColor="blue" borderStyle="single" padding={1}>
				<Text bold color="blue">
					⚡ Task Detail: {currentTask.title}
				</Text>
				<Box marginLeft={2}>
					<Text color={getStatusColor(currentTask.status)}>
						{getStatusIcon(currentTask.status)} {currentTask.status.toUpperCase()}
					</Text>
				</Box>
			</Box>

			{/* Controls */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="yellow">↑↓ Navigate Subtasks | ESC/Q Back | S Stop Task</Text>
			</Box>

			{/* Task details */}
			<Box flexDirection="column" padding={1}>
				<Text bold>Description:</Text>
				<Text color="gray">{currentTask.description}</Text>

				<Text bold marginTop={1}>
					Progress:
				</Text>
				<Text color="gray">
					{getProgressBar(currentTask.progress)} {currentTask.progress}%
				</Text>

				<Text bold marginTop={1}>
					Timing:
				</Text>
				<Text color="gray">Started: {currentTask.startTime?.toLocaleString() || "Not started"}</Text>
				{currentTask.endTime && <Text color="gray">Completed: {currentTask.endTime.toLocaleString()}</Text>}
				<Text color="gray">Duration: {formatDuration(currentTask.startTime, currentTask.endTime)}</Text>

				{currentTask.error && (
					<>
						<Text bold color="red" marginTop={1}>
							Error:
						</Text>
						<Text color="red">{currentTask.error}</Text>
					</>
				)}
			</Box>

			{/* Subtasks */}
			{currentTask.subtasks && currentTask.subtasks.length > 0 && (
				<Box flexDirection="column" flexGrow={1}>
					<Box borderColor="gray" borderStyle="single" paddingX={1}>
						<Text bold color="yellow">
							Subtasks:
						</Text>
					</Box>
					{currentTask.subtasks.map((subtask, index) => (
						<Box flexDirection="column" key={subtask.id} paddingX={1}>
							<Text
								backgroundColor={index === selectedSubtaskIndex ? "white" : undefined}
								bold={index === selectedSubtaskIndex}
								color={index === selectedSubtaskIndex ? "black" : getStatusColor(subtask.status)}>
								{getStatusIcon(subtask.status)} {subtask.title}
							</Text>
							<Box marginLeft={2}>
								<Text color="gray">
									{subtask.description} | {subtask.progress}%
								</Text>
							</Box>
							{subtask.error && (
								<Box marginLeft={2}>
									<Text color="red">Error: {subtask.error}</Text>
								</Box>
							)}
						</Box>
					))}
				</Box>
			)}

			{/* Status */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="gray">
					Subtask {selectedSubtaskIndex + 1} of {currentTask.subtasks?.length || 0} | Task started:{" "}
					{formatDuration(currentTask.startTime)} ago
				</Text>
			</Box>
		</Box>
	)
}
