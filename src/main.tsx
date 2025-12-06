import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

console.log('🚀 Main.tsx: Starting React app...');
console.log('🚀 React version:', React.version);
console.log('🚀 Root element:', document.getElementById("root"));

// Import App with error handling
import("./App.tsx")
  .then((module) => {
    const App = module.default;
    console.log('✅ App imported successfully');
    
    try {
      const rootElement = document.getElementById("root");
      if (!rootElement) {
        throw new Error("Root element not found!");
      }
      
      const root = createRoot(rootElement);
      console.log('🚀 Root created, rendering App...');
      root.render(React.createElement(App));
      console.log('✅ App rendered successfully');
    } catch (error: any) {
      console.error('❌ Error rendering app:', error);
      const errorMessage = error?.message || String(error);
      const errorStack = error?.stack || '';
      const rootElement = document.getElementById("root");
      if (rootElement) {
        rootElement.innerHTML = `
          <div style="padding: 20px; font-family: Arial; background: #fafafa; min-height: 100vh;">
            <h1 style="color: red;">Error Loading App</h1>
            <pre style="background: white; padding: 20px; border-radius: 4px; white-space: pre-wrap;">${errorMessage}\n\n${errorStack}</pre>
          </div>
        `;
      }
    }
  })
  .catch((importError) => {
    console.error('❌ Error importing App:', importError);
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; font-family: Arial; background: #fafafa; min-height: 100vh;">
          <h1 style="color: red;">Error Importing App</h1>
          <pre style="background: white; padding: 20px; border-radius: 4px; white-space: pre-wrap;">${importError?.message || String(importError)}\n\n${importError?.stack || ''}</pre>
          <p style="margin-top: 20px; color: #666;">Check the browser console (F12) for more details.</p>
        </div>
      `;
    }
  });
