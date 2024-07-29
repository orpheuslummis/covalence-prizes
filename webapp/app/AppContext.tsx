'use client';

import React, { useContext } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { config } from '../config';
import { AppContextType, Role } from './types';

const defaultAppContext: AppContextType = {
    account: {
        address: undefined,
        isConnected: false,
    },
    connect: {
        connectAsync: async () => ({ connector: undefined }),
        connectors: [],
    },
    disconnect: {
        disconnectAsync: async () => { },
    },
    publicClient: undefined,
    walletClient: undefined,
    contracts: config.contracts,
    prizeManager: {
        prizes: [],
        createPrize: async () => null,
        getPrizes: async () => ({ prizes: [], totalCount: 0 }),
        getPrize: async () => null,
        deactivatePrize: async () => false,
        refreshPrize: async () => null,
        fundPrize: async () => false,
        assignCriteriaWeights: async () => false,
        moveToNextState: async () => false,
        getPrizeState: async () => null,
        prizeUpdateTrigger: 0,
        getUserRoles: async () => [],
        addEvaluators: async () => false,
    },
    userRoles: new Set<Role>(),
    setUserRoles: () => { },
    isLoading: false,
    setIsLoading: () => { },
};

export const AppContext = React.createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => {
    const context = useContext(AppContext);
    const account = useAccount();
    const connect = useConnect();
    const disconnect = useDisconnect();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    if (typeof window === 'undefined') {
        return defaultAppContext;
    }

    if (!context) {
        console.warn('useAppContext was called outside of AppProvider');
        return defaultAppContext;
    }

    return {
        ...context,
        account,
        connect,
        disconnect,
        publicClient,
        walletClient,
    };
};