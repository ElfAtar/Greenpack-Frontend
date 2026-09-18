// Utility function to get the backend URL dynamically
export const getBackendUrl = (): string => {
  // Try to get from environment variables first (standardizing on both names)
  const envUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    // If the env URL contains '/api', remove it because builders add it back
    return envUrl.replace(/\/api\/?$/, '');
  }

  const currentHost = window.location.hostname;
  const currentPort = window.location.port;
  const currentProtocol = window.location.protocol;


  // LIVE ENVIRONMENT: If we are not on localhost, the backend is likely at the same origin
  // This prevents the app from "insisting" on localhost in production
  return `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}`;
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getBackendUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/api/${cleanEndpoint}`;
};
