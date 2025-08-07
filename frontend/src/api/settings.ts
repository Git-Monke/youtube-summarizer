// API base URL - should match other API modules
const API_BASE_URL = 'http://localhost:8008'

// Server configuration interface
export interface ServerConfig {
  LLM_PROVIDER: string
  MAX_CHUNK_SIZE: number
  WHISPER_MODEL: string
  WHISPER_DEVICE: string
  WHISPER_COMPUTE_TYPE: string
  OLLAMA_MODEL: string
  OLLAMA_BASE_URL: string
  OPENROUTER_MODEL: string
  OPENROUTER_BASE_URL: string
  OPENROUTER_APP_NAME: string
  OPENROUTER_SITE_URL: string
  OPENROUTER_API_KEY: string
}

// Connection test result interface
export interface ConnectionTestResult {
  success: boolean
  provider: string
  message?: string
  error?: string
}

// API response interfaces
interface ConfigResponse {
  success: boolean
  config: ServerConfig
  detail?: string
}

// Load server configuration
export const loadServerConfig = async (): Promise<ServerConfig> => {
  const response = await fetch(`${API_BASE_URL}/api/config`)
  
  if (!response.ok) {
    throw new Error(`Failed to load configuration: ${response.statusText}`)
  }
  
  const data: ConfigResponse = await response.json()
  
  if (!data.success) {
    throw new Error(data.detail || 'Failed to load configuration')
  }
  
  return data.config
}

// Save server configuration
export const saveServerConfig = async (config: ServerConfig): Promise<ServerConfig> => {
  const response = await fetch(`${API_BASE_URL}/api/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  })
  
  if (!response.ok) {
    throw new Error(`Failed to save configuration: ${response.statusText}`)
  }
  
  const data: ConfigResponse = await response.json()
  
  if (!data.success) {
    throw new Error(data.detail || 'Failed to save configuration')
  }
  
  return data.config
}

// Test connection to LLM provider
export const testConnection = async (provider?: string): Promise<ConnectionTestResult> => {
  const response = await fetch(`${API_BASE_URL}/api/config/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ provider })
  })
  
  if (!response.ok) {
    throw new Error(`Connection test failed: ${response.statusText}`)
  }
  
  const data: ConnectionTestResult = await response.json()
  
  // Always return the result, even if success is false
  // The error will be in the result.error field
  return data
}