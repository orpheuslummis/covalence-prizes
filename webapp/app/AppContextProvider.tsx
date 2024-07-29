'use client';

import { useQuery } from '@tanstack/react-query';
import React, { ReactNode, useState } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { config } from '../config';
import { useError } from '../hooks/useError';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { AppContext, defaultAppContext } from './AppContext';
import { AppContextType, Role } from './types';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userRoles, setUserRoles] = useState<Role[]>([]);
    const account = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const { getPrizes, ...otherPrizeManagerFunctions } = usePrizeManager();
    const { handleError } = useError();

    const { data: prizesData } = useQuery({
        queryKey: ['initialPrizes'],
        queryFn: () => getPrizes(1, 10),
        onError: (error) => handleError('Error fetching prizes', error as Error),
    });

    const contextValue = React.useMemo<AppContextType>(() => ({
        ...defaultAppContext,
        account,
        connect: connect as (() => Promise<void>) | null,
        disconnect: disconnect as (() => Promise<void>) | null,
        publicClient,
        walletClient,
        contracts: config.contracts,
        prizeManager: {
            ...otherPrizeManagerFunctions,
            getPrizes,
            deactivatePrize: async () => false, // Implement if needed
            refreshPrize: async (id: string) => otherPrizeManagerFunctions.getPrize(id),
            getPrizeState: async (id: string) => {
                const prize = await otherPrizeManagerFunctions.getPrize(id);
                return prize ? prize.status : null;
            },
            prizeUpdateTrigger: 0, // Implement if needed
        },
        isLoading,
        setIsLoading,
        userRoles,
        setUserRoles,
        prizes: prizesData?.prizes || [],
    }), [account, connect, disconnect, publicClient, walletClient, otherPrizeManagerFunctions, getPrizes, isLoading, userRoles, prizesData]);

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};