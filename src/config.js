// This file centralizes all configuration and makes it available at runtime
window.__APP_CONFIG__ = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
};

// Export the config for use in app
export const config = window.__APP_CONFIG__; 