import React from 'react'

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('Error Boundary caught an error:', error, errorInfo)

        // You can also log the error to an error reporting service here
        // Example: logErrorToService(error, errorInfo)

        this.setState({
            error,
            errorInfo,
        })
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        })
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        padding: '2rem',
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        color: '#fff',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '600px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            padding: '2rem',
                            borderRadius: '1rem',
                            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <h1 style={{ color: '#ff6584', marginBottom: '1rem' }}>
                            ⚠️ Something went wrong
                        </h1>
                        <p style={{ marginBottom: '1.5rem', color: '#a0a0a0' }}>
                            We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
                        </p>

                        {this.state.error && (
                            <details
                                style={{
                                    marginBottom: '1.5rem',
                                    padding: '1rem',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <summary style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    Error Details
                                </summary>
                                <pre
                                    style={{
                                        fontSize: '0.85rem',
                                        overflow: 'auto',
                                        color: '#ff6584',
                                        margin: 0,
                                    }}
                                >
                                    {this.state.error.toString()}
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    background: 'linear-gradient(90deg, #4f46e5 0%, #3b82f6 100%)',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    background: 'transparent',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
