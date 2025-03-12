// Define the configuration interface
interface AppConfig {
  googleClientId: string;
}

// Declare the global window property
declare global {
  interface Window {
    __APP_CONFIG__: AppConfig;
  }
}

// Use the window config if it exists, otherwise use default
const defaultConfig: AppConfig = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
};

// Export the config for use in app
export const config: AppConfig = (window.__APP_CONFIG__ || defaultConfig); 