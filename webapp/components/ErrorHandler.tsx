'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorProvider, useError } from '../app/ErrorContext';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return <h1>Something went wrong.</h1>;
        }

        return this.props.children;
    }
}

const ErrorDisplay: React.FC = () => {
    const { error, clearError } = useError();

    if (!error) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 z-50">
            <p>{error.message}</p>
            <button onClick={clearError} className="ml-4 underline">Dismiss</button>
        </div>
    );
};

const ErrorHandler: React.FC<Props> = ({ children }) => {
    return (
        <ErrorProvider>
            <ErrorBoundary>
                <ErrorDisplay />
                {children}
            </ErrorBoundary>
        </ErrorProvider>
    );
};

export default ErrorHandler;