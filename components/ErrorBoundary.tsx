"use client";
import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI Error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
            <div className="text-center p-8">
              <p className="text-xl mb-2">Something went wrong</p>
              <p className="text-sm text-gray-400 mb-4">
                The app hit an unexpected error.
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Reload App
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
