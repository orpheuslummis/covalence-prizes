'use client';

import React, { useContext } from 'react';
import { config } from '../config';
import { AppContextType } from './types';

export const defaultAppContext: AppContextType = {
    account: {
        address: undefined,
        isConnected: false,
    },
    connect: null,
    disconnect: null,
    publicClient: null,
    walletClient: null,
    contracts: config.contracts,
    prizeManager: {
        prizes: [],
        createPrize: async () => null,
        getPrizes: async () => ({ prizes: [], totalCount: 0 }),
        getPrize: async () => null,
        deactivatePrize: async () => false,
        refreshPrize: async () => null,
        getPrizeState: async () => null,
        prizeUpdateTrigger: 0,
        getUserRoles: async () => [],
        addEvaluators: async () => false,
    },
    userRoles: [],
    setUserRoles: () => { },
    isLoading: false,
    setIsLoading: () => { },
};

export const AppContext = React.createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};