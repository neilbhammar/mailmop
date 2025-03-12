import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center h-screen p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <pre className="bg-red-100 p-3 rounded text-xs overflow-auto max-h-40 mb-4">
              {this.state.error?.stack || 'No stack trace available'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 