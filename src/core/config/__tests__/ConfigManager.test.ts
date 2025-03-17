import { ExtensionContext } from "vscode"
import { ConfigManager, ApiConfigData } from "../ConfigManager"
import { ApiConfiguration } from "../../../shared/api"

// Mock VSCode ExtensionContext
const mockSecrets = {
	get: jest.fn(),
	store: jest.fn(),
	delete: jest.fn(),
}

const mockContext = {
	secrets: mockSecrets,
} as unknown as ExtensionContext

describe("ConfigManager", () => {
	let configManager: ConfigManager

	beforeEach(() => {
		jest.clearAllMocks()
		configManager = new ConfigManager(mockContext)
	})

	describe("initConfig", () => {
		it("should not write to storage when secrets.get returns null", async () => {
			// Mock readConfig to return null
			mockSecrets.get.mockResolvedValueOnce(null)

			await configManager.initConfig()

			// Should not write to storage because readConfig returns defaultConfig
			expect(mockSecrets.store).not.toHaveBeenCalled()
		})

		it("should not initialize config if it exists", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: {
						default: {
							config: {},
							id: "default",
						},
					},
				}),
			)

			await configManager.initConfig()

			expect(mockSecrets.store).not.toHaveBeenCalled()
		})

		it("should generate IDs for configs that lack them", async () => {
			// Mock a config with missing IDs
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: {
						default: {
							config: {},
						},
						test: {
							apiProvider: "anthropic",
						},
					},
				}),
			)

			await configManager.initConfig()

			// Should have written the config with new IDs
			expect(mockSecrets.store).toHaveBeenCalled()
			const storedConfig = JSON.parse(mockSecrets.store.mock.calls[0][1])
			expect(storedConfig.apiConfigs.default.id).toBeTruthy()
			expect(storedConfig.apiConfigs.test.id).toBeTruthy()
		})

		it("should throw error if secrets storage fails", async () => {
			mockSecrets.get.mockRejectedValue(new Error("Storage failed"))

			await expect(configManager.initConfig()).rejects.toThrow(
				"Failed to initialize config: Error: Failed to read config from secrets: Error: Storage failed",
			)
		})
	})

	describe("ListConfig", () => {
		it("should list all available configs", async () => {
			const existingConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {
					default: {
						id: "default",
					},
					test: {
						apiProvider: "anthropic",
						id: "test-id",
					},
				},
				modeApiConfigs: {
					code: "default",
					architect: "default",
					ask: "default",
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(existingConfig))

			const configs = await configManager.listConfig()
			expect(configs).toEqual([
				{ name: "default", id: "default", apiProvider: undefined },
				{ name: "test", id: "test-id", apiProvider: "anthropic" },
			])
		})

		it("should handle empty config file", async () => {
			const emptyConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {},
				modeApiConfigs: {
					code: "default",
					architect: "default",
					ask: "default",
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(emptyConfig))

			const configs = await configManager.listConfig()
			expect(configs).toEqual([])
		})

		it("should throw error if reading from secrets fails", async () => {
			mockSecrets.get.mockRejectedValue(new Error("Read failed"))

			await expect(configManager.listConfig()).rejects.toThrow(
				"Failed to list configs: Error: Failed to read config from secrets: Error: Read failed",
			)
		})
	})

	describe("SaveConfig", () => {
		it("should save new config", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: {
						default: {},
					},
					modeApiConfigs: {
						code: "default",
						architect: "default",
						ask: "default",
					},
				}),
			)

			const newConfig: ApiConfiguration = {
				apiProvider: "anthropic",
				apiKey: "test-key",
			}

			await configManager.saveConfig("test", newConfig)

			// Get the actual stored config to check the generated ID
			const storedConfig = JSON.parse(mockSecrets.store.mock.calls[0][1])
			const testConfigId = storedConfig.apiConfigs.test.id

			const expectedConfig = {
				currentApiConfigName: "default",
				apiConfigs: {
					default: {},
					test: {
						...newConfig,
						id: testConfigId,
						rateLimitSeconds: 0, // Default rate limit is 0 seconds
					},
				},
				modeApiConfigs: {
					code: "default",
					architect: "default",
					ask: "default",
				},
			}

			expect(mockSecrets.store).toHaveBeenCalledWith(
				"roo_cline_config_api_config",
				JSON.stringify(expectedConfig, null, 2),
			)
		})

		it("should update existing config", async () => {
			const existingConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {
					test: {
						apiProvider: "anthropic",
						apiKey: "old-key",
						id: "test-id",
					},
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(existingConfig))

			const updatedConfig: ApiConfiguration = {
				apiProvider: "anthropic",
				apiKey: "new-key",
			}

			await configManager.saveConfig("test", updatedConfig)

			const expectedConfig = {
				currentApiConfigName: "default",
				apiConfigs: {
					test: {
						apiProvider: "anthropic",
						apiKey: "new-key",
						id: "test-id",
						rateLimitSeconds: 0, // Default rate limit is 0 seconds
					},
				},
			}

			expect(mockSecrets.store).toHaveBeenCalledWith(
				"roo_cline_config_api_config",
				JSON.stringify(expectedConfig, null, 2),
			)
		})

		it("should throw error if secrets storage fails", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: { default: {} },
				}),
			)
			mockSecrets.store.mockRejectedValueOnce(new Error("Storage failed"))

			await expect(configManager.saveConfig("test", {})).rejects.toThrow(
				"Failed to save config: Error: Failed to write config to secrets: Error: Storage failed",
			)
		})
	})

	describe("DeleteConfig", () => {
		it("should delete existing config", async () => {
			const existingConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {
					default: {
						id: "default",
					},
					test: {
						apiProvider: "anthropic",
						id: "test-id",
					},
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(existingConfig))

			await configManager.deleteConfig("test")

			// Get the stored config to check the ID
			const storedConfig = JSON.parse(mockSecrets.store.mock.calls[0][1])
			expect(storedConfig.currentApiConfigName).toBe("default")
			expect(Object.keys(storedConfig.apiConfigs)).toEqual(["default"])
			expect(storedConfig.apiConfigs.default.id).toBeTruthy()
		})

		it("should throw error when trying to delete non-existent config", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: { default: {} },
				}),
			)

			await expect(configManager.deleteConfig("nonexistent")).rejects.toThrow("Config 'nonexistent' not found")
		})

		it("should throw error when trying to delete last remaining config", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: {
						default: {
							id: "default",
						},
					},
				}),
			)

			await expect(configManager.deleteConfig("default")).rejects.toThrow(
				"Cannot delete the last remaining configuration.",
			)
		})
	})

	describe("LoadConfig", () => {
		it("should load config and update current config name", async () => {
			const existingConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {
					test: {
						apiProvider: "anthropic",
						apiKey: "test-key",
						id: "test-id",
					},
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(existingConfig))

			const config = await configManager.loadConfig("test")

			expect(config).toEqual({
				apiProvider: "anthropic",
				apiKey: "test-key",
				id: "test-id",
			})

			// Get the stored config to check the structure
			const storedConfig = JSON.parse(mockSecrets.store.mock.calls[0][1])
			expect(storedConfig.currentApiConfigName).toBe("test")
			expect(storedConfig.apiConfigs.test).toEqual({
				apiProvider: "anthropic",
				apiKey: "test-key",
				id: "test-id",
			})
		})

		it("should throw error when config does not exist", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: {
						default: {
							config: {},
							id: "default",
						},
					},
				}),
			)

			await expect(configManager.loadConfig("nonexistent")).rejects.toThrow("Config 'nonexistent' not found")
		})

		it("should throw error if secrets storage fails", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: {
						test: {
							config: {
								apiProvider: "anthropic",
							},
							id: "test-id",
						},
					},
				}),
			)
			mockSecrets.store.mockRejectedValueOnce(new Error("Storage failed"))

			await expect(configManager.loadConfig("test")).rejects.toThrow(
				"Failed to load config: Error: Failed to write config to secrets: Error: Storage failed",
			)
		})
	})

	describe("SetCurrentConfig", () => {
		it("should set current config", async () => {
			const existingConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {
					default: {
						id: "default",
					},
					test: {
						apiProvider: "anthropic",
						id: "test-id",
					},
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(existingConfig))

			await configManager.setCurrentConfig("test")

			// Get the stored config to check the structure
			const storedConfig = JSON.parse(mockSecrets.store.mock.calls[0][1])
			expect(storedConfig.currentApiConfigName).toBe("test")
			expect(storedConfig.apiConfigs.default.id).toBe("default")
			expect(storedConfig.apiConfigs.test).toEqual({
				apiProvider: "anthropic",
				id: "test-id",
			})
		})

		it("should throw error when config does not exist", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: { default: {} },
				}),
			)

			await expect(configManager.setCurrentConfig("nonexistent")).rejects.toThrow(
				"Config 'nonexistent' not found",
			)
		})

		it("should throw error if secrets storage fails", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: {
						test: { apiProvider: "anthropic" },
					},
				}),
			)
			mockSecrets.store.mockRejectedValueOnce(new Error("Storage failed"))

			await expect(configManager.setCurrentConfig("test")).rejects.toThrow(
				"Failed to set current config: Error: Failed to write config to secrets: Error: Storage failed",
			)
		})
	})

	describe("ResetAllConfigs", () => {
		it("should delete all stored configs", async () => {
			// Setup initial config
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "test",
					apiConfigs: {
						test: {
							apiProvider: "anthropic",
							id: "test-id",
						},
					},
				}),
			)

			await configManager.resetAllConfigs()

			// Should have called delete with the correct config key
			expect(mockSecrets.delete).toHaveBeenCalledWith("roo_cline_config_api_config")
		})
	})

	describe("HasConfig", () => {
		it("should return true for existing config", async () => {
			const existingConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {
					default: {
						id: "default",
					},
					test: {
						apiProvider: "anthropic",
						id: "test-id",
					},
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(existingConfig))

			const hasConfig = await configManager.hasConfig("test")
			expect(hasConfig).toBe(true)
		})

		it("should return false for non-existent config", async () => {
			mockSecrets.get.mockResolvedValue(
				JSON.stringify({
					currentApiConfigName: "default",
					apiConfigs: { default: {} },
				}),
			)

			const hasConfig = await configManager.hasConfig("nonexistent")
			expect(hasConfig).toBe(false)
		})

		it("should throw error if secrets storage fails", async () => {
			mockSecrets.get.mockRejectedValue(new Error("Storage failed"))

			await expect(configManager.hasConfig("test")).rejects.toThrow(
				"Failed to check config existence: Error: Failed to read config from secrets: Error: Storage failed",
			)
		})
	})

	describe("migrateRateLimitToProfiles", () => {
		it("should migrate global rate limit to all profiles", async () => {
			// Setup mock context with global rate limit
			const mockGlobalState = {
				get: jest.fn().mockResolvedValue(15), // Mock global rate limit of 15 seconds
				update: jest.fn(),
			}
			;(mockContext as any).globalState = mockGlobalState

			// Setup existing configs without rate limits
			const existingConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {
					default: {
						id: "default",
						apiProvider: "anthropic",
					},
					test: {
						id: "test-id",
						apiProvider: "openrouter",
					},
				},
			}

			mockSecrets.get.mockResolvedValue(JSON.stringify(existingConfig))

			// Call the migration method
			await configManager.migrateRateLimitToProfiles()

			// Verify the configs were updated with the rate limit
			const storedConfig = JSON.parse(mockSecrets.store.mock.calls[0][1])
			expect(storedConfig.apiConfigs.default.rateLimitSeconds).toBe(15)
			expect(storedConfig.apiConfigs.test.rateLimitSeconds).toBe(15)

			// Verify the global rate limit was removed
			expect(mockGlobalState.update).toHaveBeenCalledWith("rateLimitSeconds", undefined)
		})

		it("should handle empty config case", async () => {
			// Setup mock context with global rate limit
			const mockGlobalState = {
				get: jest.fn().mockResolvedValue(10), // Mock global rate limit of 10 seconds
				update: jest.fn(),
			}
			;(mockContext as any).globalState = mockGlobalState

			// Setup empty config
			const emptyConfig: ApiConfigData = {
				currentApiConfigName: "default",
				apiConfigs: {},
			}

			// Mock the readConfig and writeConfig methods
			mockSecrets.get.mockResolvedValue(JSON.stringify(emptyConfig))
			mockSecrets.store.mockResolvedValue(undefined)

			// Use the existing configManager instance
			await configManager.migrateRateLimitToProfiles()

			// Verify the global rate limit was removed even with empty config
			expect(mockGlobalState.update).toHaveBeenCalledWith("rateLimitSeconds", undefined)
		})

		it("should handle errors gracefully", async () => {
			// Setup mock context with global rate limit
			const mockGlobalState = {
				get: jest.fn().mockResolvedValue(5), // Mock global rate limit of 5 seconds
				update: jest.fn(),
			}
			;(mockContext as any).globalState = mockGlobalState

			// Force an error during read
			mockSecrets.get.mockRejectedValue(new Error("Storage failed"))

			// Expect the migration to throw an error
			await expect(configManager.migrateRateLimitToProfiles()).rejects.toThrow(
				"Failed to migrate rate limit settings: Error: Failed to read config from secrets: Error: Storage failed",
			)
		})
	})
})
