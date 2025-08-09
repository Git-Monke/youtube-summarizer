// Dynamic API base URL that adapts to the current hostname
// Works with localhost, IP addresses, and any other hostname
export const getApiBaseUrl = (): string => {
  // Use current protocol and hostname, but target backend port 8008
  return `${window.location.protocol}//${window.location.hostname}:8008`
}

// Export as constant for compatibility
export const API_BASE_URL = getApiBaseUrl()