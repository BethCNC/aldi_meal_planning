import { Component } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

/**
 * ErrorBoundary Component
 * 
 * Uses design tokens for typography and colors.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-semibold mb-2 text-text-body">Something went wrong</h1>
              <p className="text-base font-medium text-text-subtle mb-6">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-text-subtle">
                    Error Details (dev only)
                  </summary>
                  <pre className="mt-2 text-xs font-medium bg-surface-card p-4 rounded overflow-auto text-text-body">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
