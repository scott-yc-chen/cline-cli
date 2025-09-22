/**
 * Simplified proto types for CLI testing
 */

export namespace host {
	export interface ShowTextDocumentRequest {
		path: string
		options?: any
	}

	export interface TextEditorInfo {
		documentPath: string
		viewColumn?: number
		isActive: boolean
	}

	export interface ShowOpenDialogueRequest {
		canSelectMany?: boolean
		openLabel?: string
		filters?: any
	}

	export interface SelectedResources {
		paths: string[]
	}

	export enum ShowMessageType {
		ERROR = 0,
		INFORMATION = 1,
		WARNING = 2,
	}

	export interface ShowMessageRequest {
		type: ShowMessageType
		message: string
		options?: any
	}

	export interface SelectedResponse {
		selectedOption?: string
	}

	export interface ShowInputBoxRequest {
		title: string
		prompt?: string
		value?: string
	}

	export interface ShowInputBoxResponse {
		response?: string
	}

	export interface ShowSaveDialogRequest {
		options?: any
	}

	export interface ShowSaveDialogResponse {
		selectedPath?: string
	}

	export interface OpenFileRequest {
		filePath: string
	}

	export type OpenFileResponse = {}

	export interface OpenSettingsRequest {
		query?: string
	}

	export type OpenSettingsResponse = {}

	export type GetOpenTabsRequest = {}
	export interface GetOpenTabsResponse {
		paths: string[]
	}

	export type GetVisibleTabsRequest = {}
	export interface GetVisibleTabsResponse {
		paths: string[]
	}

	export type GetActiveEditorRequest = {}
	export interface GetActiveEditorResponse {
		filePath?: string
	}

	export interface GetWorkspacePathsRequest {
		id?: string
	}

	export interface GetWorkspacePathsResponse {
		id?: string
		paths: string[]
	}

	export interface SaveOpenDocumentIfDirtyRequest {
		filePath?: string
	}

	export interface SaveOpenDocumentIfDirtyResponse {
		wasSaved?: boolean
	}

	export type GetDiagnosticsRequest = {}
	export interface GetDiagnosticsResponse {
		diagnostics: Diagnostic[]
	}

	export enum DiagnosticSeverity {
		ERROR = 0,
		WARNING = 1,
		INFORMATION = 2,
		HINT = 3,
	}

	export interface Diagnostic {
		source?: string
		line: number
		character: number
		severity: DiagnosticSeverity
		message: string
		code?: string
		tags: any[]
	}

	export type OpenProblemsPanelRequest = {}
	export type OpenProblemsPanelResponse = {}

	export interface OpenInFileExplorerPanelRequest {
		path?: string
	}
	export type OpenInFileExplorerPanelResponse = {}

	export type OpenClineSidebarPanelRequest = {}
	export type OpenClineSidebarPanelResponse = {}

	export interface OpenDiffRequest {
		path: string
		content?: string
	}

	export interface OpenDiffResponse {
		id?: string
		success: boolean
	}

	export interface GetDocumentTextRequest {
		path: string
	}

	export interface GetDocumentTextResponse {
		content: string
	}

	export interface ReplaceTextRequest {
		path: string
		startLine?: number
		endLine?: number
		newText?: string
	}

	export interface ReplaceTextResponse {
		success: boolean
	}

	export interface ScrollDiffRequest {
		diffId: string
		lineNumber?: number
	}

	export interface ScrollDiffResponse {
		success: boolean
	}

	export interface TruncateDocumentRequest {
		path: string
		maxLines?: number
	}

	export interface TruncateDocumentResponse {
		success: boolean
	}

	export interface SaveDocumentRequest {
		path: string
	}

	export interface SaveDocumentResponse {
		success: boolean
	}

	export type CloseAllDiffsRequest = {}
	export interface CloseAllDiffsResponse {
		success: boolean
	}

	export interface OpenMultiFileDiffRequest {
		files: Array<{ path: string; content?: string }>
	}

	export interface OpenMultiFileDiffResponse {
		success: boolean
	}

	export interface GetHostVersionResponse {
		version: string
		buildNumber: string
		hostName: string
	}

	export interface GetTelemetrySettingsResponse {
		telemetryLevel: any
		isEnabled: boolean
	}

	export interface TelemetrySettingsEvent {
		telemetryLevel: any
		isEnabled: boolean
	}
}

export namespace cline {
	export interface StringRequest {
		value: string
	}

	export type Empty = {}

	export type EmptyRequest = {}

	export interface String {
		value: string
	}

	export enum TelemetryLevel {
		ALL = 0,
		ERROR = 1,
		CRASH = 2,
		OFF = 3,
	}
}
