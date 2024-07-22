import React from 'react';
import { useError } from '../ErrorContext';

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

export default ErrorDisplay;