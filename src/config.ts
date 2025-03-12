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
  googleClientId: '179016010492-a1mand26uvfmfcbs8vbngec2n4ckecku.apps.googleusercontent.com'
};

// Export the config for use in app
export const config: AppConfig = (window.__APP_CONFIG__ || defaultConfig); 