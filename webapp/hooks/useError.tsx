'use client';

import React, { ReactNode, createContext, useContext, useMemo, useState } from 'react';

interface ErrorContextType {
    error: Error | null;
    setError: (error: Error | null) => void;
    clearError: () => void;
    handleError: (message: string, error: Error) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [error, setError] = useState<Error | null>(null);

    const clearError = () => setError(null);

    const handleError = (message: string, error: Error) => {
        console.error(message, error);
        setError(error);
    };

    const contextValue = useMemo(() => ({
        error,
        setError,
        clearError,
        handleError
    }), [error]);

    return (
        <ErrorContext.Provider value={contextValue}>
            {children}
        </ErrorContext.Provider>
    );
};

export const useError = () => {
    const context = useContext(ErrorContext);
    if (context === undefined) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
};