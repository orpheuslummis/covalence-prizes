'use client';

import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { config } from '../config';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { AppContext } from './AppContext';
import { ErrorProvider } from './ErrorContext';
import { AppContextType, Role, UserRoles } from './types';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userRoles, setUserRoles] = useState<UserRoles>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const account = useAccount();
    const connect = useConnect();
    const disconnect = useDisconnect();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const prizeManager = usePrizeManager();

    const fetchRoles = useCallback(async () => {
        if (account.isConnected && account.address) {
            try {
                console.log('Fetching roles for address:', account.address);
                const prizesResult = await prizeManager.getPrizes();
                const userRoles = new Set<Role>();
                if (prizesResult && prizesResult.prizes) {
                    for (const prize of prizesResult.prizes) {
                        const roles = await prizeManager.getUserRoles(account.address, prize.prizeAddress);
                        roles.forEach(role => userRoles.add(role as Role));
                    }
                }
                console.log('Fetched roles:', userRoles);
                setUserRoles(userRoles);
            } catch (error) {
                console.error('Error fetching user roles:', error);
                setUserRoles(new Set());
            }
        } else {
            console.log('Not connected, clearing roles');
            setUserRoles(new Set());
        }
    }, [account.isConnected, account.address, prizeManager]);

    useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            try {
                if (account.isConnected) {
                    await fetchRoles();
                }
            } catch (error) {
                console.error("Error initializing app:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, [account.isConnected, account.address, fetchRoles]);

    const contextValue: AppContextType = {
        account,
        connect,
        disconnect,
        publicClient,
        walletClient,
        contracts: config.contracts,
        prizeManager,
        userRoles,
        setUserRoles,
        isLoading,
        setIsLoading,
    };

    return (
        <ErrorProvider>
            <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
        </ErrorProvider>
    );
};