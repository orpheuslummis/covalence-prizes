'use client';

import React, { useContext } from 'react';
import { Address } from 'viem';
import { config } from '../config';
import { Prize, PrizeParams, Role } from './types';

export interface AppContextType {
    account: {
        address: Address | undefined,
        isConnected: boolean,
    },
    connect: (() => Promise<void>) | null,
    disconnect: (() => Promise<void>) | null,
    publicClient: any | null,
    walletClient: any | null,
    contracts: typeof config.contracts,
    prizeManager: {
        createPrize: (params: PrizeParams) => Promise<void>,
        getPrizes: (page: number, perPage: number) => Promise<{ prizes: Prize[], totalCount: number }>,
        getPrize: (id: string | number) => Promise<Prize | null>,
        updateStrategy: (params: { strategyName: string; strategyAddress: Address }) => Promise<void>,
        isLoading: boolean,
        getOwner: Address | undefined,
        prizeCount: number,
    },
    userRoles: Role[],
    setUserRoles: React.Dispatch<React.SetStateAction<Role[]>>,
    isLoading: boolean,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    prizes: Prize[],
};

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
        createPrize: async () => { },
        getPrizes: async () => ({ prizes: [], totalCount: 0 }),
        getPrize: async () => null,
        updateStrategy: async () => { },
        isLoading: false,
        getOwner: undefined,
        prizeCount: 0,
    },
    userRoles: [],
    setUserRoles: () => { },
    isLoading: false,
    setIsLoading: () => { },
    prizes: [],
};

export const AppContext = React.createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};