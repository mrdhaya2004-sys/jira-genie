import React from 'react';
import testzoneLogo from '@/assets/testzone-logo.png';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  label?: string;
  resetKeys?: Array<string | number | boolean | null | undefined>;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

const keysChanged = (a: ErrorBoundaryProps['resetKeys'] = [], b: ErrorBoundaryProps['resetKeys'] = []) => {
  if (a.length !== b.length) return true;
  return a.some((key, index) => !Object.is(key, b[index]));
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[Test Zone] ${this.props.label || 'UI'} crashed`, error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  private reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-6 text-center shadow-lg">
          <img src={testzoneLogo} alt="Test Zone" className="mx-auto mb-4 h-12 w-12 rounded-xl" />
          <h1 className="text-lg font-semibold">Test Zone is still running</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A section failed to render, so it was isolated instead of blanking the app.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;