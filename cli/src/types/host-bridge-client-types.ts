/**
 * Local copy of host bridge client types for CLI implementation
 */

// Simplified types for testing - we'll use any for now to get tests running
export interface WindowServiceClientInterface {
	showTextDocument(request: any): Promise<any>
	showOpenDialogue(request: any): Promise<any>
	showMessage(request: any): Promise<any>
	showInputBox(request: any): Promise<any>
	showSaveDialog(request: any): Promise<any>
	openFile(request: any): Promise<any>
	openSettings(request: any): Promise<any>
	getOpenTabs(request: any): Promise<any>
	getVisibleTabs(request: any): Promise<any>
	getActiveEditor(request: any): Promise<any>
}

export interface WorkspaceServiceClientInterface {
	getWorkspacePaths(request: any): Promise<any>
	saveOpenDocumentIfDirty(request: any): Promise<any>
	getDiagnostics(request: any): Promise<any>
	openProblemsPanel(request: any): Promise<any>
	openInFileExplorerPanel(request: any): Promise<any>
	openClineSidebarPanel(request: any): Promise<any>
}

export interface DiffServiceClientInterface {
	openDiff(request: any): Promise<any>
	getDocumentText(request: any): Promise<any>
	replaceText(request: any): Promise<any>
	scrollDiff(request: any): Promise<any>
	truncateDocument(request: any): Promise<any>
	saveDocument(request: any): Promise<any>
	closeAllDiffs(request: any): Promise<any>
	openMultiFileDiff(request: any): Promise<any>
}

export interface EnvServiceClientInterface {
	clipboardWriteText(request: any): Promise<any>
	clipboardReadText(request: any): Promise<any>
	getMachineId(request: any): Promise<any>
	getHostVersion(request: any): Promise<any>
	getHostname(request: any): Promise<any>
	getIdeRedirectUri(request: any): Promise<any>
	getTelemetrySettings(request: any): Promise<any>
	subscribeToTelemetrySettings(request: any, callbacks: any): () => void
}
