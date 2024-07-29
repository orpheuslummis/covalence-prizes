'use client';

import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { config } from '../config';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { AppContext, defaultAppContext } from './AppContext';
import { AppContextType } from './types';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userRoles, setUserRoles] = useState<string[]>([]);
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
                const userRolesSet = new Set<string>();
                if (prizesResult && prizesResult.prizes) {
                    for (const prize of prizesResult.prizes) {
                        const roles = await prizeManager.getUserRoles(account.address, prize.prizeAddress);
                        roles.forEach(role => userRolesSet.add(role));
                    }
                }
                console.log('Fetched roles:', userRolesSet);
                setUserRoles(Array.from(userRolesSet));
            } catch (error) {
                console.error('Error fetching user roles:', error);
                setUserRoles([]);
            }
        } else {
            console.log('Not connected, clearing roles');
            setUserRoles([]);
        }
    }, [account.isConnected, account.address, prizeManager]);

    useEffect(() => {
        let isMounted = true;
        const initializeApp = async () => {
            if (!isMounted) return;
            setIsLoading(true);
            try {
                if (account.isConnected) {
                    await fetchRoles();
                }
            } catch (error) {
                console.error("Error initializing app:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initializeApp();
        return () => { isMounted = false; };
    }, [account.isConnected, account.address, fetchRoles]);

    const contextValue = React.useMemo<AppContextType>(() => ({
        ...defaultAppContext,
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
    }), [account, connect, disconnect, publicClient, walletClient, prizeManager, userRoles, isLoading]);

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};