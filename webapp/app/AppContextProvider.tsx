'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { AppContext } from './AppContext';
import { ErrorProvider } from './ErrorContext';
import { config } from './config';
import { useWeb3 } from './hooks/useWeb3';
import { AppContextType, Role } from './types';

const USER_ROLE_KEY = 'userRole';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<Role>(null);
    const [isLoading, setIsLoading] = useState(true);
    const web3 = useWeb3();

    useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            try {
                const storedRole = localStorage.getItem(USER_ROLE_KEY) as Role;
                if (storedRole) {
                    setRole(storedRole);
                }
                // Wait for Web3 initialization
                await new Promise<void>((resolve) => {
                    if (web3.isInitialized) {
                        resolve();
                    } else {
                        const checkInterval = setInterval(() => {
                            if (web3.isInitialized) {
                                clearInterval(checkInterval);
                                resolve();
                            }
                        }, 100);
                    }
                });
            } catch (error) {
                console.error("Error initializing app:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, [web3.isInitialized]);

    const updateRole = (newRole: Role) => {
        setRole(newRole);
        localStorage.setItem(USER_ROLE_KEY, newRole || '');
    };

    const contextValue: AppContextType = {
        web3,
        role,
        setRole: updateRole,
        disconnect: web3.disconnect,
        updateConnectionState: web3.updateConnectionState,
        isLoading,
        setIsLoading,
        contracts: config.contracts,
    };

    return (
        <ErrorProvider>
            <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
        </ErrorProvider>
    );
};