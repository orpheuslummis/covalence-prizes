'use client';

import { useQuery } from '@tanstack/react-query';
import React, { ReactNode, useCallback, useMemo, useState } from 'react';
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

    const memoizedConnect = useCallback(() => connect() as Promise<void>, [connect]);
    const memoizedDisconnect = useCallback(() => disconnect() as Promise<void>, [disconnect]);

    const memoizedDeactivatePrize = useCallback(async () => false, []);
    const memoizedRefreshPrize = useCallback(
        async (id: string) => otherPrizeManagerFunctions.getPrize(id),
        [otherPrizeManagerFunctions]
    );
    const memoizedGetPrizeState = useCallback(
        async (id: string) => {
            const prize = await otherPrizeManagerFunctions.getPrize(id);
            return prize ? prize.status : null;
        },
        [otherPrizeManagerFunctions]
    );

    const contextValue = useMemo<AppContextType>(() => ({
        ...defaultAppContext,
        account,
        connect: memoizedConnect,
        disconnect: memoizedDisconnect,
        publicClient,
        walletClient,
        contracts: config.contracts,
        prizeManager: {
            ...otherPrizeManagerFunctions,
            getPrizes,
            deactivatePrize: memoizedDeactivatePrize,
            refreshPrize: memoizedRefreshPrize,
            getPrizeState: memoizedGetPrizeState,
            prizeUpdateTrigger: 0, // Consider removing if not needed
        },
        isLoading,
        userRoles,
        prizes: prizesData?.prizes || [],
    }), [
        account,
        memoizedConnect,
        memoizedDisconnect,
        publicClient,
        walletClient,
        otherPrizeManagerFunctions,
        getPrizes,
        memoizedDeactivatePrize,
        memoizedRefreshPrize,
        memoizedGetPrizeState,
        isLoading,
        userRoles,
        prizesData
    ]);

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};