'use client';

import React, { useContext } from 'react';
import { AppContextType } from './types';

export const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (typeof window === 'undefined') {
        // Return a default value during server-side rendering
        return {} as AppContextType;
    }
    if (!context) {
        console.warn('useAppContext was called outside of AppProvider');
        return {} as AppContextType;
    }
    return context;
};