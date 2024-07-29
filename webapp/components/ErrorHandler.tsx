'use client';

import React, { ReactNode } from 'react';
import { ErrorProvider } from '../app/ErrorContext';

interface Props {
    children: ReactNode;
}

const ErrorHandler: React.FC<Props> = ({ children }) => {
    return (
        <ErrorProvider>
            {children}
        </ErrorProvider>
    );
};

export default ErrorHandler;