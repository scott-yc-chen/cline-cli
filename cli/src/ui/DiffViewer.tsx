import { Box, Text, useInput } from "ink"
import React, { useState } from "react"
import { CliHostBridge } from "../hosts/CliHostBridge"

interface DiffViewerProps {
	hostBridge: CliHostBridge
}

interface DiffChange {
	type: "added" | "removed" | "unchanged"
	lineNumber: number
	content: string
}

interface DiffEntry {
	id: string
	filePath: string
	changes: DiffChange[]
	isApplied: boolean
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ hostBridge }) => {
	const [diffs, setDiffs] = useState<DiffEntry[]>([])
	const [selectedDiffIndex, setSelectedDiffIndex] = useState(0)
	const [selectedLineIndex, setSelectedLineIndex] = useState(0)
	const [viewMode, setViewMode] = useState<"list" | "detail">("list")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useInput((input, key) => {
		if (viewMode === "list") {
			if (key.upArrow) {
				setSelectedDiffIndex(Math.max(0, selectedDiffIndex - 1))
			} else if (key.downArrow) {
				setSelectedDiffIndex(Math.min(diffs.length - 1, selectedDiffIndex + 1))
			} else if (key.return) {
				if (diffs[selectedDiffIndex]) {
					setViewMode("detail")
					setSelectedLineIndex(0)
				}
			} else if (input === "a") {
				applyDiff(selectedDiffIndex)
			} else if (input === "r") {
				rejectDiff(selectedDiffIndex)
			} else if (input === "c") {
				clearAllDiffs()
			}
		} else if (viewMode === "detail") {
			if (key.upArrow) {
				const currentDiff = diffs[selectedDiffIndex]
				if (currentDiff) {
					setSelectedLineIndex(Math.max(0, selectedLineIndex - 1))
				}
			} else if (key.downArrow) {
				const currentDiff = diffs[selectedDiffIndex]
				if (currentDiff) {
					setSelectedLineIndex(Math.min(currentDiff.changes.length - 1, selectedLineIndex + 1))
				}
			} else if (key.escape || input === "q") {
				setViewMode("list")
			} else if (input === "a") {
				applyDiff(selectedDiffIndex)
			} else if (input === "r") {
				rejectDiff(selectedDiffIndex)
			}
		}

		// Global shortcuts
		if (input === "g") {
			generateSampleDiff()
		}
	})

	const generateSampleDiff = () => {
		// Generate a sample diff for demonstration
		const sampleDiff: DiffEntry = {
			id: `diff-${Date.now()}`,
			filePath: "/example/file.ts",
			isApplied: false,
			changes: [
				{ type: "unchanged", lineNumber: 1, content: 'import React from "react";' },
				{ type: "unchanged", lineNumber: 2, content: "" },
				{ type: "removed", lineNumber: 3, content: "const oldFunction = () => {" },
				{ type: "removed", lineNumber: 4, content: '  console.log("old");' },
				{ type: "removed", lineNumber: 5, content: "};" },
				{ type: "added", lineNumber: 3, content: "const newFunction = () => {" },
				{ type: "added", lineNumber: 4, content: '  console.log("new and improved");' },
				{ type: "added", lineNumber: 5, content: "  return true;" },
				{ type: "added", lineNumber: 6, content: "};" },
				{ type: "unchanged", lineNumber: 7, content: "" },
				{ type: "unchanged", lineNumber: 8, content: "export default newFunction;" },
			],
		}

		setDiffs((prev) => [...prev, sampleDiff])
	}

	const applyDiff = async (index: number) => {
		const diff = diffs[index]
		if (!diff || diff.isApplied) {
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const diffClient = hostBridge.getDiffClient()

			// Create a mock diff for demonstration
			await diffClient.createDiff({
				original: generateOriginalContent(diff),
				modified: generateModifiedContent(diff),
				filename: diff.filePath,
			})

			// Mark as applied
			setDiffs((prev) => prev.map((d, i) => (i === index ? { ...d, isApplied: true } : d)))

			const window = hostBridge.getWindowClient()
			await window.showInformationMessage(`Applied diff for ${diff.filePath}`)
		} catch (err) {
			setError(`Failed to apply diff: ${err instanceof Error ? err.message : "Unknown error"}`)
		} finally {
			setIsLoading(false)
		}
	}

	const rejectDiff = (index: number) => {
		setDiffs((prev) => prev.filter((_, i) => i !== index))
		if (selectedDiffIndex >= diffs.length - 1) {
			setSelectedDiffIndex(Math.max(0, diffs.length - 2))
		}
	}

	const clearAllDiffs = () => {
		setDiffs([])
		setSelectedDiffIndex(0)
		setViewMode("list")
	}

	const generateOriginalContent = (diff: DiffEntry): string => {
		return diff.changes
			.filter((change) => change.type !== "added")
			.map((change) => change.content)
			.join("\n")
	}

	const generateModifiedContent = (diff: DiffEntry): string => {
		return diff.changes
			.filter((change) => change.type !== "removed")
			.map((change) => change.content)
			.join("\n")
	}

	const getLineColor = (change: DiffChange): string => {
		switch (change.type) {
			case "added":
				return "green"
			case "removed":
				return "red"
			case "unchanged":
				return "gray"
			default:
				return "white"
		}
	}

	const getLinePrefix = (change: DiffChange): string => {
		switch (change.type) {
			case "added":
				return "+"
			case "removed":
				return "-"
			case "unchanged":
				return " "
			default:
				return " "
		}
	}

	if (viewMode === "list") {
		return (
			<Box flexDirection="column" height="100%">
				{/* Header */}
				<Box borderColor="blue" borderStyle="single" padding={1}>
					<Text bold color="blue">
						🔄 Diff Viewer
					</Text>
					<Box marginLeft={2}>
						<Text color="gray">{diffs.length} pending diffs</Text>
					</Box>
				</Box>

				{/* Controls */}
				<Box borderColor="gray" borderStyle="single" paddingX={1}>
					<Text color="yellow">↑↓ Navigate | Enter View | A Apply | R Reject | C Clear All | G Generate Sample</Text>
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
						<Text color="cyan">Processing diff...</Text>
					</Box>
				)}

				{/* Diff list */}
				<Box flexDirection="column" flexGrow={1}>
					{diffs.length === 0 ? (
						<Box padding={1}>
							<Text color="gray">No diffs available. Press 'G' to generate a sample diff.</Text>
						</Box>
					) : (
						diffs.map((diff, index) => (
							<Box key={diff.id} paddingX={1}>
								<Text
									backgroundColor={index === selectedDiffIndex ? "blue" : undefined}
									bold={index === selectedDiffIndex}
									color={index === selectedDiffIndex ? "black" : "white"}>
									{diff.isApplied ? "✅" : "⏳"} {diff.filePath}
									<Text color="gray">
										{" "}
										({diff.changes.filter((c) => c.type !== "unchanged").length} changes)
									</Text>
								</Text>
							</Box>
						))
					)}
				</Box>

				{/* Status */}
				<Box borderColor="gray" borderStyle="single" paddingX={1}>
					<Text color="gray">
						Applied: {diffs.filter((d) => d.isApplied).length} | Pending: {diffs.filter((d) => !d.isApplied).length}
					</Text>
				</Box>
			</Box>
		)
	}

	// Detail view
	const currentDiff = diffs[selectedDiffIndex]
	if (!currentDiff) {
		return (
			<Box padding={1}>
				<Text color="red">No diff selected</Text>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" height="100%">
			{/* Header */}
			<Box borderColor="blue" borderStyle="single" padding={1}>
				<Text bold color="blue">
					🔄 Diff Detail: {currentDiff.filePath}
				</Text>
				<Box marginLeft={2}>
					<Text color={currentDiff.isApplied ? "green" : "yellow"}>
						{currentDiff.isApplied ? "Applied" : "Pending"}
					</Text>
				</Box>
			</Box>

			{/* Controls */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="yellow">↑↓ Navigate | ESC/Q Back | A Apply | R Reject</Text>
			</Box>

			{/* Diff content */}
			<Box flexDirection="column" flexGrow={1}>
				{currentDiff.changes.map((change, index) => (
					<Box key={index} paddingX={1}>
						<Text
							backgroundColor={index === selectedLineIndex ? "white" : undefined}
							bold={index === selectedLineIndex}
							color={index === selectedLineIndex ? "black" : getLineColor(change)}>
							<Text color={getLineColor(change)}>{getLinePrefix(change)}</Text>
							<Text>
								{change.lineNumber.toString().padStart(4, " ")}: {change.content}
							</Text>
						</Text>
					</Box>
				))}
			</Box>

			{/* Status */}
			<Box borderColor="gray" borderStyle="single" paddingX={1}>
				<Text color="gray">
					Line {selectedLineIndex + 1} of {currentDiff.changes.length} |
					<Text color="green"> +{currentDiff.changes.filter((c) => c.type === "added").length}</Text>
					<Text color="red"> -{currentDiff.changes.filter((c) => c.type === "removed").length}</Text>
				</Text>
			</Box>
		</Box>
	)
}
