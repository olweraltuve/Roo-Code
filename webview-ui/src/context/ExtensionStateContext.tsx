import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useEvent } from "react-use"
import { ApiConfigMeta, ExtensionMessage, ExtensionState } from "../../../src/shared/ExtensionMessage"
import { ApiConfiguration } from "../../../src/shared/api"
import { vscode } from "../utils/vscode"
import { convertTextMateToHljs } from "../utils/textMateToHljs"
import { findLastIndex } from "../../../src/shared/array"
import { McpServer } from "../../../src/shared/mcp"
import { checkExistKey } from "../../../src/shared/checkExistApiConfig"
import { Mode, CustomModePrompts, defaultModeSlug, defaultPrompts, ModeConfig } from "../../../src/shared/modes"
import { CustomSupportPrompts } from "../../../src/shared/support-prompt"
import { experimentDefault, ExperimentId } from "../../../src/shared/experiments"
import { TelemetrySetting } from "../../../src/shared/TelemetrySetting"

export interface ExtensionStateContextType extends ExtensionState {
	didHydrateState: boolean
	showWelcome: boolean
	theme: any
	mcpServers: McpServer[]
	currentCheckpoint?: string
	filePaths: string[]
	openedTabs: Array<{ label: string; isActive: boolean; path?: string }>
	setApiConfiguration: (config: ApiConfiguration) => void
	setCustomInstructions: (value?: string) => void
	setAlwaysAllowReadOnly: (value: boolean) => void
	setAlwaysAllowWrite: (value: boolean) => void
	setAlwaysAllowExecute: (value: boolean) => void
	setAlwaysAllowBrowser: (value: boolean) => void
	setAlwaysAllowMcp: (value: boolean) => void
	setAlwaysAllowModeSwitch: (value: boolean) => void
	setAlwaysAllowSubtasks: (value: boolean) => void
	setBrowserToolEnabled: (value: boolean) => void
	setShowRooIgnoredFiles: (value: boolean) => void
	setShowAnnouncement: (value: boolean) => void
	setAllowedCommands: (value: string[]) => void
	setSoundEnabled: (value: boolean) => void
	setSoundVolume: (value: number) => void
	setDiffEnabled: (value: boolean) => void
	setEnableCheckpoints: (value: boolean) => void
	setBrowserViewportSize: (value: string) => void
	setFuzzyMatchThreshold: (value: number) => void
	setWriteDelayMs: (value: number) => void
	screenshotQuality?: number
	setScreenshotQuality: (value: number) => void
	terminalOutputLineLimit?: number
	setTerminalOutputLineLimit: (value: number) => void
	mcpEnabled: boolean
	setMcpEnabled: (value: boolean) => void
	enableMcpServerCreation: boolean
	setEnableMcpServerCreation: (value: boolean) => void
	enableCustomModeCreation?: boolean
	setEnableCustomModeCreation: (value: boolean) => void
	alwaysApproveResubmit?: boolean
	setAlwaysApproveResubmit: (value: boolean) => void
	requestDelaySeconds: number
	setRequestDelaySeconds: (value: number) => void
	rateLimitSeconds: number
	setRateLimitSeconds: (value: number) => void
	setCurrentApiConfigName: (value: string) => void
	setListApiConfigMeta: (value: ApiConfigMeta[]) => void
	mode: Mode
	setMode: (value: Mode) => void
	setCustomModePrompts: (value: CustomModePrompts) => void
	setCustomSupportPrompts: (value: CustomSupportPrompts) => void
	enhancementApiConfigId?: string
	setEnhancementApiConfigId: (value: string) => void
	setExperimentEnabled: (id: ExperimentId, enabled: boolean) => void
	setAutoApprovalEnabled: (value: boolean) => void
	customModes: ModeConfig[]
	setCustomModes: (value: ModeConfig[]) => void
	setMaxOpenTabsContext: (value: number) => void
	maxWorkspaceFiles: number
	setMaxWorkspaceFiles: (value: number) => void
	setTelemetrySetting: (value: TelemetrySetting) => void
	remoteBrowserEnabled?: boolean
	setRemoteBrowserEnabled: (value: boolean) => void
	machineId?: string

	// Profile-specific settings
	setProfileSpecificSetting: (profileId: string, setting: string, value: any) => void
	isProfileSpecific: (profileId: string, setting: string) => boolean
	toggleProfileSpecific: (profileId: string, setting: string) => void
}

export const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined)

export const mergeExtensionState = (prevState: ExtensionState, newState: ExtensionState) => {
	const {
		apiConfiguration: prevApiConfiguration,
		customModePrompts: prevCustomModePrompts,
		customSupportPrompts: prevCustomSupportPrompts,
		experiments: prevExperiments,
		profileSpecificSettings: prevProfileSpecificSettings,
		...prevRest
	} = prevState

	const {
		apiConfiguration: newApiConfiguration,
		customModePrompts: newCustomModePrompts,
		customSupportPrompts: newCustomSupportPrompts,
		experiments: newExperiments,
		profileSpecificSettings: newProfileSpecificSettings,
		...newRest
	} = newState

	const apiConfiguration = { ...prevApiConfiguration, ...newApiConfiguration }
	const customModePrompts = { ...prevCustomModePrompts, ...newCustomModePrompts }
	const customSupportPrompts = { ...prevCustomSupportPrompts, ...newCustomSupportPrompts }
	const experiments = { ...prevExperiments, ...newExperiments }
	const profileSpecificSettings = { ...prevProfileSpecificSettings, ...newProfileSpecificSettings }
	const rest = { ...prevRest, ...newRest }

	return { ...rest, apiConfiguration, customModePrompts, customSupportPrompts, experiments, profileSpecificSettings }
}

export const ExtensionStateContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [state, setState] = useState<ExtensionState>({
		version: "",
		clineMessages: [],
		taskHistory: [],
		shouldShowAnnouncement: false,
		allowedCommands: [],
		soundEnabled: false,
		soundVolume: 0.5,
		diffEnabled: false,
		enableCheckpoints: true,
		checkpointStorage: "task",
		fuzzyMatchThreshold: 1.0,
		language: "en", // Default language code
		enableCustomModeCreation: true,
		writeDelayMs: 1000,
		browserViewportSize: "900x600",
		screenshotQuality: 75,
		terminalOutputLineLimit: 500,
		mcpEnabled: true,
		enableMcpServerCreation: true,
		alwaysApproveResubmit: false,
		requestDelaySeconds: 5,
		rateLimitSeconds: 0, // Minimum time between successive requests (0 = disabled)
		currentApiConfigName: "default",
		listApiConfigMeta: [],
		mode: defaultModeSlug,
		customModePrompts: defaultPrompts,
		customSupportPrompts: {},
		experiments: experimentDefault,
		enhancementApiConfigId: "",
		autoApprovalEnabled: false,
		customModes: [],
		maxOpenTabsContext: 20,
		maxWorkspaceFiles: 200,
		cwd: "",
		browserToolEnabled: true,
		telemetrySetting: "unset",
		showRooIgnoredFiles: true, // Default to showing .rooignore'd files with lock symbol (current behavior)
		profileSpecificSettings: {}, // Initialize empty profile-specific settings
	})

	const [didHydrateState, setDidHydrateState] = useState(false)
	const [showWelcome, setShowWelcome] = useState(false)
	const [theme, setTheme] = useState<any>(undefined)
	const [filePaths, setFilePaths] = useState<string[]>([])
	const [openedTabs, setOpenedTabs] = useState<Array<{ label: string; isActive: boolean; path?: string }>>([])

	const [mcpServers, setMcpServers] = useState<McpServer[]>([])
	const [currentCheckpoint, setCurrentCheckpoint] = useState<string>()

	const setListApiConfigMeta = useCallback(
		(value: ApiConfigMeta[]) => setState((prevState) => ({ ...prevState, listApiConfigMeta: value })),
		[],
	)
	const handleMessage = useCallback(
		(event: MessageEvent) => {
			const message: ExtensionMessage = event.data
			switch (message.type) {
				case "state": {
					const newState = message.state!
					setState((prevState) => mergeExtensionState(prevState, newState))
					setShowWelcome(!checkExistKey(newState.apiConfiguration))
					setDidHydrateState(true)
					break
				}
				case "theme": {
					if (message.text) {
						setTheme(convertTextMateToHljs(JSON.parse(message.text)))
					}
					break
				}
				case "workspaceUpdated": {
					const paths = message.filePaths ?? []
					const tabs = message.openedTabs ?? []

					setFilePaths(paths)
					setOpenedTabs(tabs)
					break
				}
				case "partialMessage": {
					const partialMessage = message.partialMessage!
					setState((prevState) => {
						// worth noting it will never be possible for a more up-to-date message to be sent here or in normal messages post since the presentAssistantContent function uses lock
						const lastIndex = findLastIndex(prevState.clineMessages, (msg) => msg.ts === partialMessage.ts)
						if (lastIndex !== -1) {
							const newClineMessages = [...prevState.clineMessages]
							newClineMessages[lastIndex] = partialMessage
							return { ...prevState, clineMessages: newClineMessages }
						}
						return prevState
					})
					break
				}
				case "mcpServers": {
					setMcpServers(message.mcpServers ?? [])
					break
				}
				case "currentCheckpointUpdated": {
					setCurrentCheckpoint(message.text)
					break
				}
				case "listApiConfig": {
					setListApiConfigMeta(message.listApiConfig ?? [])
					break
				}
			}
		},
		[setListApiConfigMeta],
	)

	useEvent("message", handleMessage)

	useEffect(() => {
		vscode.postMessage({ type: "webviewDidLaunch" })
	}, [])

	const contextValue: ExtensionStateContextType = {
		...state,
		didHydrateState,
		showWelcome,
		theme,
		mcpServers,
		currentCheckpoint,
		filePaths,
		openedTabs,
		soundVolume: state.soundVolume,
		fuzzyMatchThreshold: state.fuzzyMatchThreshold,
		writeDelayMs: state.writeDelayMs,
		screenshotQuality: state.screenshotQuality,
		setExperimentEnabled: (id, enabled) =>
			setState((prevState) => ({ ...prevState, experiments: { ...prevState.experiments, [id]: enabled } })),
		setApiConfiguration: (value) =>
			setState((prevState) => ({
				...prevState,
				apiConfiguration: {
					...prevState.apiConfiguration,
					...value,
				},
			})),
		setCustomInstructions: (value) => setState((prevState) => ({ ...prevState, customInstructions: value })),
		setAlwaysAllowReadOnly: (value) => setState((prevState) => ({ ...prevState, alwaysAllowReadOnly: value })),
		setAlwaysAllowWrite: (value) => setState((prevState) => ({ ...prevState, alwaysAllowWrite: value })),
		setAlwaysAllowExecute: (value) => setState((prevState) => ({ ...prevState, alwaysAllowExecute: value })),
		setAlwaysAllowBrowser: (value) => setState((prevState) => ({ ...prevState, alwaysAllowBrowser: value })),
		setAlwaysAllowMcp: (value) => setState((prevState) => ({ ...prevState, alwaysAllowMcp: value })),
		setAlwaysAllowModeSwitch: (value) => setState((prevState) => ({ ...prevState, alwaysAllowModeSwitch: value })),
		setAlwaysAllowSubtasks: (value) => setState((prevState) => ({ ...prevState, alwaysAllowSubtasks: value })),
		setShowAnnouncement: (value) => setState((prevState) => ({ ...prevState, shouldShowAnnouncement: value })),
		setAllowedCommands: (value) => setState((prevState) => ({ ...prevState, allowedCommands: value })),
		setSoundEnabled: (value) => setState((prevState) => ({ ...prevState, soundEnabled: value })),
		setSoundVolume: (value) => setState((prevState) => ({ ...prevState, soundVolume: value })),
		setDiffEnabled: (value) => setState((prevState) => ({ ...prevState, diffEnabled: value })),
		setEnableCheckpoints: (value) => setState((prevState) => ({ ...prevState, enableCheckpoints: value })),
		setBrowserViewportSize: (value: string) =>
			setState((prevState) => ({ ...prevState, browserViewportSize: value })),
		setFuzzyMatchThreshold: (value) => setState((prevState) => ({ ...prevState, fuzzyMatchThreshold: value })),
		setWriteDelayMs: (value) => setState((prevState) => ({ ...prevState, writeDelayMs: value })),
		setScreenshotQuality: (value) => setState((prevState) => ({ ...prevState, screenshotQuality: value })),
		setTerminalOutputLineLimit: (value) =>
			setState((prevState) => ({ ...prevState, terminalOutputLineLimit: value })),
		setMcpEnabled: (value) => setState((prevState) => ({ ...prevState, mcpEnabled: value })),
		setEnableMcpServerCreation: (value) =>
			setState((prevState) => ({ ...prevState, enableMcpServerCreation: value })),
		setAlwaysApproveResubmit: (value) => setState((prevState) => ({ ...prevState, alwaysApproveResubmit: value })),
		setRequestDelaySeconds: (value) => setState((prevState) => ({ ...prevState, requestDelaySeconds: value })),
		setRateLimitSeconds: (value) => setState((prevState) => ({ ...prevState, rateLimitSeconds: value })),
		setCurrentApiConfigName: (value) => setState((prevState) => ({ ...prevState, currentApiConfigName: value })),
		setListApiConfigMeta,
		setMode: (value: Mode) => setState((prevState) => ({ ...prevState, mode: value })),
		setCustomModePrompts: (value) => setState((prevState) => ({ ...prevState, customModePrompts: value })),
		setCustomSupportPrompts: (value) => setState((prevState) => ({ ...prevState, customSupportPrompts: value })),
		setEnhancementApiConfigId: (value) =>
			setState((prevState) => ({ ...prevState, enhancementApiConfigId: value })),
		setEnableCustomModeCreation: (value) =>
			setState((prevState) => ({ ...prevState, enableCustomModeCreation: value })),
		setAutoApprovalEnabled: (value) => setState((prevState) => ({ ...prevState, autoApprovalEnabled: value })),
		setCustomModes: (value) => setState((prevState) => ({ ...prevState, customModes: value })),
		setMaxOpenTabsContext: (value) => setState((prevState) => ({ ...prevState, maxOpenTabsContext: value })),
		setMaxWorkspaceFiles: (value) => setState((prevState) => ({ ...prevState, maxWorkspaceFiles: value })),
		setBrowserToolEnabled: (value) => setState((prevState) => ({ ...prevState, browserToolEnabled: value })),
		setTelemetrySetting: (value) => setState((prevState) => ({ ...prevState, telemetrySetting: value })),
		setShowRooIgnoredFiles: (value) => setState((prevState) => ({ ...prevState, showRooIgnoredFiles: value })),
		setRemoteBrowserEnabled: (value) => setState((prevState) => ({ ...prevState, remoteBrowserEnabled: value })),

		// Profile-specific settings functions
		setProfileSpecificSetting: (profileId, setting, value) => {
			setState((prevState) => {
				const profileSpecificSettings = prevState.profileSpecificSettings || {}
				const profileSettings = profileSpecificSettings[profileId] || {}

				return {
					...prevState,
					profileSpecificSettings: {
						...profileSpecificSettings,
						[profileId]: {
							...profileSettings,
							[setting]: value,
						},
					},
				}
			})
		},
		isProfileSpecific: (profileId, setting) => {
			return (
				state.profileSpecificSettings?.[profileId]?.[
					setting as keyof (typeof state.profileSpecificSettings)[string]
				] !== undefined
			)
		},
		toggleProfileSpecific: (profileId, setting) => {
			setState((prevState) => {
				const profileSpecificSettings = prevState.profileSpecificSettings || {}
				const profileSettings = profileSpecificSettings[profileId] || {}

				// If it's already profile-specific, remove the setting to use global
				if (profileSettings[setting as keyof typeof profileSettings] !== undefined) {
					const newProfileSettings = { ...profileSettings }
					delete newProfileSettings[setting as keyof typeof newProfileSettings]

					return {
						...prevState,
						profileSpecificSettings: {
							...profileSpecificSettings,
							[profileId]: newProfileSettings,
						},
					}
				}
				// Otherwise, make it profile-specific with the current global value
				else {
					const globalValue = prevState[setting as keyof typeof prevState]

					return {
						...prevState,
						profileSpecificSettings: {
							...profileSpecificSettings,
							[profileId]: {
								...profileSettings,
								[setting]: globalValue,
							},
						},
					}
				}
			})
		},
	}

	return <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>
}

export const useExtensionState = () => {
	const context = useContext(ExtensionStateContext)
	if (context === undefined) {
		throw new Error("useExtensionState must be used within an ExtensionStateContextProvider")
	}
	return context
}
