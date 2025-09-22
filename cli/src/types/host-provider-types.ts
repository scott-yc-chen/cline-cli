/**
 * Local copy of host provider types for CLI implementation
 */

import {
	DiffServiceClientInterface,
	EnvServiceClientInterface,
	WindowServiceClientInterface,
	WorkspaceServiceClientInterface,
} from "./host-bridge-client-types"

/**
 * Interface for host bridge client providers
 */
export interface HostBridgeClientProvider {
	workspaceClient: WorkspaceServiceClientInterface
	envClient: EnvServiceClientInterface
	windowClient: WindowServiceClientInterface
	diffClient: DiffServiceClientInterface
}

/**
 * Callback interface for streaming requests
 */
export interface StreamingCallbacks<T = any> {
	onResponse: (response: T) => void
	onError?: (error: Error) => void
	onComplete?: () => void
}
