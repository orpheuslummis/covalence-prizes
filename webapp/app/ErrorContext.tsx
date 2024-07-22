'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface ErrorContextType {
    error: Error | null;
    setError: (error: Error) => void;
    clearError: () => void;
    handleError: (message: string, error: unknown) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [error, setErrorState] = useState<Error | null>(null);

    const setError = useCallback((newError: Error) => {
        console.error(newError);
        setErrorState(newError);
    }, []);

    const clearError = useCallback(() => setErrorState(null), []);

    const handleError = useCallback((message: string, error: unknown) => {
        const errorObject = error instanceof Error ? error : new Error(message);
        setError(errorObject);
    }, [setError]);

    return (
        <ErrorContext.Provider value={{ error, setError, clearError, handleError }}>
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