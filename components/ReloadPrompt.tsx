
import React from 'react';

// The virtual import 'virtual:pwa-register/react' causes issues in some runtime environments.
// We disable the prompt UI for now to ensure the app loads correctly.
// Service worker registration is still handled by the vite-plugin-pwa injection configuration.

const ReloadPrompt: React.FC = () => {
  return null;
};

export default ReloadPrompt;
