import { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import { Settings, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, TestTube } from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  serverConfigAtom,
  settingsLoadingAtom,
  settingsErrorAtom,
  settingsSuccessAtom,
  testingConnectionAtom,
  testResultAtom,
  loadSettingsAtom,
  saveSettingsAtom,
  testConnectionAtom
} from '../store/settings'
import type { ServerConfig } from '../api/settings'

export function SettingsPage() {
  const [config, setConfig] = useAtom(serverConfigAtom)
  const [loading] = useAtom(settingsLoadingAtom)
  const [error] = useAtom(settingsErrorAtom)
  const [success] = useAtom(settingsSuccessAtom)
  const [testing] = useAtom(testingConnectionAtom)
  const [testResult] = useAtom(testResultAtom)
  const [, loadSettings] = useAtom(loadSettingsAtom)
  const [, saveSettings] = useAtom(saveSettingsAtom)
  const [, testConnection] = useAtom(testConnectionAtom)
  const [showApiKey, setShowApiKey] = useState(false)
  const [originalConfig, setOriginalConfig] = useState<ServerConfig | null>(null)

  // Load configuration on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Track original config when it loads
  useEffect(() => {
    if (config && !originalConfig) {
      setOriginalConfig(config)
    }
  }, [config, originalConfig])

  const saveConfig = () => {
    if (!config || !originalConfig) return
    
    // Create a copy of config and filter out masked sensitive values
    const filteredConfig: Partial<ServerConfig> = {}
    
    // List of sensitive keys that might be masked
    const sensitiveKeys = ['OPENROUTER_API_KEY'] as const
    
    for (const [key, value] of Object.entries(config)) {
      const typedKey = key as keyof ServerConfig
      
      // For sensitive keys, check if the value looks masked
      if (sensitiveKeys.includes(typedKey as any)) {
        const currentValue = String(value)
        const originalValue = String(originalConfig[typedKey])
        
        // If current value contains "..." and is shorter than a typical API key, 
        // it's likely masked, so skip it
        if (currentValue.includes('...') && currentValue.length < 20) {
          continue // Don't include this key in the update
        }
        
        // If value hasn't changed from original (and original was masked), skip it
        if (currentValue === originalValue && originalValue.includes('...')) {
          continue
        }
      }
      
      filteredConfig[typedKey] = value
    }
    
    // Only save if we have something to update
    if (Object.keys(filteredConfig).length > 0) {
      saveSettings(filteredConfig as ServerConfig)
    }
  }

  const testConnectionHandler = (provider?: string) => {
    testConnection(provider)
  }

  const updateConfig = (field: keyof ServerConfig, value: string | number) => {
    if (!config) return
    setConfig({ ...config, [field]: value })
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Loading configuration...</span>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Configuration</h2>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <Button onClick={loadSettings}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Server Configuration</h1>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* LLM Provider Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            LLM Provider Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <select
                value={config.LLM_PROVIDER}
                onChange={(e) => updateConfig('LLM_PROVIDER', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="openrouter">OpenRouter (Cloud)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Max Chunk Size</label>
              <input
                type="number"
                value={config.MAX_CHUNK_SIZE}
                onChange={(e) => updateConfig('MAX_CHUNK_SIZE', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                placeholder="32000"
              />
              <p className="text-xs text-muted-foreground mt-1">Should be half of model's context window</p>
            </div>
          </div>

          {/* Ollama Configuration */}
          {config.LLM_PROVIDER === 'ollama' && (
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-medium mb-3">Ollama Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <input
                    type="text"
                    value={config.OLLAMA_MODEL}
                    onChange={(e) => updateConfig('OLLAMA_MODEL', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="qwen3:4b"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Base URL</label>
                  <input
                    type="url"
                    value={config.OLLAMA_BASE_URL}
                    onChange={(e) => updateConfig('OLLAMA_BASE_URL', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="http://localhost:11434"
                  />
                </div>
              </div>
            </div>
          )}

          {/* OpenRouter Configuration */}
          {config.LLM_PROVIDER === 'openrouter' && (
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-medium mb-3">OpenRouter Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={config.OPENROUTER_API_KEY}
                      onChange={(e) => updateConfig('OPENROUTER_API_KEY', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background"
                      placeholder="sk-or-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Model</label>
                    <input
                      type="text"
                      value={config.OPENROUTER_MODEL}
                      onChange={(e) => updateConfig('OPENROUTER_MODEL', e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="qwen/qwen-3-7b-instruct"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Base URL</label>
                    <input
                      type="url"
                      value={config.OPENROUTER_BASE_URL}
                      onChange={(e) => updateConfig('OPENROUTER_BASE_URL', e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="https://openrouter.ai/api/v1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Connection */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
            <Button
              onClick={() => testConnectionHandler()}
              disabled={testing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Test Connection
            </Button>
            
            {testResult && (
              <div className={`flex items-center gap-2 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {testResult.success ? testResult.message : testResult.error}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Whisper Configuration */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Whisper Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Model Size</label>
              <select
                value={config.WHISPER_MODEL}
                onChange={(e) => updateConfig('WHISPER_MODEL', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="tiny.en">Tiny (English)</option>
                <option value="base.en">Base (English)</option>
                <option value="small.en">Small (English)</option>
                <option value="medium.en">Medium (English)</option>
                <option value="large">Large (Multilingual)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Device</label>
              <select
                value={config.WHISPER_DEVICE}
                onChange={(e) => updateConfig('WHISPER_DEVICE', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="cpu">CPU</option>
                <option value="cuda">GPU (CUDA)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Compute Type</label>
              <select
                value={config.WHISPER_COMPUTE_TYPE}
                onChange={(e) => updateConfig('WHISPER_COMPUTE_TYPE', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="int8">INT8 (Fast, Less Accurate)</option>
                <option value="float16">Float16 (Balanced)</option>
                <option value="float32">Float32 (Slow, Most Accurate)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-8 pt-6 border-t border-border">
        <div className="flex gap-4">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            Reset Changes
          </Button>
          <Button onClick={saveConfig} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}