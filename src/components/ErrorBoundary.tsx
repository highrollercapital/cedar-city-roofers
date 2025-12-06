import { Component, ReactNode } from 'react';

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

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ Error caught by boundary:', error, errorInfo);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error info:', JSON.stringify(errorInfo, null, 2));
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1a1a1a' }}>Something went wrong</h1>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '4px', textAlign: 'left', overflow: 'auto', maxHeight: '400px', fontSize: '12px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
              {'\n\n'}
              {this.state.error?.stack || ''}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#1a1a1a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

