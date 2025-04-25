import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";

// Error boundary for catching rendering errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: 'red' }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '20px', 
              padding: '8px 16px', 
              background: '#0070f3', 
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add window error handler
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global error:", { message, source, lineno, colno, error });
  return false;
};

try {
  console.log("Starting app render...");
  const rootElement = document.getElementById("root");
  console.log("Root element:", rootElement);
  
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="light">
            <App />
          </ThemeProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log("Render completed");
  } else {
    console.error("Root element not found");
    document.body.innerHTML = '<div style="padding: 20px; font-family: system-ui;">Root element not found. Please check HTML structure.</div>';
  }
} catch (error) {
  console.error("Fatal error during initialization:", error);
  document.body.innerHTML = `<div style="padding: 20px; font-family: system-ui;">
    <h1 style="color: red;">Fatal Error</h1>
    <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 4px;">
      ${error instanceof Error ? error.stack || error.message : String(error)}
    </pre>
  </div>`;
}
