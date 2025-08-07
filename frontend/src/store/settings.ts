import { atom } from 'jotai'
import { loadServerConfig, saveServerConfig, testConnection } from '../api/settings'
import type { ServerConfig, ConnectionTestResult } from '../api/settings'

// Base state atoms
export const serverConfigAtom = atom<ServerConfig | null>(null)
export const settingsLoadingAtom = atom(false)
export const settingsErrorAtom = atom<string | null>(null)
export const settingsSuccessAtom = atom<string | null>(null)
export const testingConnectionAtom = atom(false)
export const testResultAtom = atom<ConnectionTestResult | null>(null)

// Load settings action atom
export const loadSettingsAtom = atom(
  null,
  async (_, set) => {
    try {
      set(settingsLoadingAtom, true)
      set(settingsErrorAtom, null)
      
      const config = await loadServerConfig()
      set(serverConfigAtom, config)
      
    } catch (error) {
      set(settingsErrorAtom, error instanceof Error ? error.message : 'Failed to load settings')
    } finally {
      set(settingsLoadingAtom, false)
    }
  }
)

// Save settings action atom
export const saveSettingsAtom = atom(
  null,
  async (_, set, config: ServerConfig) => {
    try {
      set(settingsLoadingAtom, true)
      set(settingsErrorAtom, null)
      set(settingsSuccessAtom, null)
      
      const updatedConfig = await saveServerConfig(config)
      set(serverConfigAtom, updatedConfig)
      set(settingsSuccessAtom, 'Configuration saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => set(settingsSuccessAtom, null), 3000)
      
    } catch (error) {
      set(settingsErrorAtom, error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      set(settingsLoadingAtom, false)
    }
  }
)

// Test connection action atom
export const testConnectionAtom = atom(
  null,
  async (_, set, provider?: string) => {
    try {
      set(testingConnectionAtom, true)
      set(testResultAtom, null)
      
      const result = await testConnection(provider)
      set(testResultAtom, result)
      
    } catch (error) {
      set(testResultAtom, {
        success: false,
        provider: provider || 'current',
        error: error instanceof Error ? error.message : 'Failed to test connection'
      })
    } finally {
      set(testingConnectionAtom, false)
    }
  }
)

// Re-export types for convenience
export type { ServerConfig, ConnectionTestResult }
