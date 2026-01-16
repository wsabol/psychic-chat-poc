import React from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logErrorFromCatch("Error in component:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ textAlign: 'center', color: 'red', padding: '2rem' }}>
                    <h2>An error occurred.</h2>
                    <p>{this.state.error && this.state.error.message}</p>
                    <p>Please refresh the page or check the console for details.</p>
                </div>
            );
        }
        return this.props.children;
    }
}
