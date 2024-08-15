'use client';

import { useQuery } from '@tanstack/react-query';
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WalletClient } from 'viem';
import { useAccount, UseAccountReturnType, useBlockNumber, useConnect, useDisconnect, usePublicClient, UsePublicClientReturnType, useWalletClient } from 'wagmi';
import { config } from '../config';
import { useError } from '../hooks/useError';
import { usePrizeDiamond } from '../hooks/usePrizeDiamond';
import { Prize, Role, UserRoles } from '../types';
type PrizeDiamondType = ReturnType<typeof usePrizeDiamond> & {
    contracts: typeof config.contracts;
};

export interface AppContextType {
    account: UseAccountReturnType;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    publicClient: UsePublicClientReturnType;
    walletClient: WalletClient | undefined;
    contracts: typeof config.contracts;
    prizeDiamond: PrizeDiamondType;
    isLoading: boolean;
    isPrizesLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    prizes: Prize[];
    userRoles: UserRoles;
    setUserRoles: React.Dispatch<React.SetStateAction<UserRoles>>;
    blockNumber: number | undefined;
    refetchPrizes: () => Promise<unknown>;
}

const defaultAppContext: AppContextType = {
    account: {
        address: undefined,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: 'disconnected',
    } as UseAccountReturnType,
    connect: async () => { },
    disconnect: async () => { },
    publicClient: null as unknown as UsePublicClientReturnType,
    walletClient: undefined,
    contracts: config.contracts,
    prizeDiamond: {} as PrizeDiamondType,
    isLoading: false,
    isPrizesLoading: false,
    setIsLoading: () => { },
    prizes: [],
    userRoles: [],
    setUserRoles: () => { },
    blockNumber: undefined,
    refetchPrizes: async () => { },
};

export const AppContext = React.createContext<AppContextType>(defaultAppContext);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isPrizesLoading, setIsPrizesLoading] = useState(true);
    const [userRoles, setUserRoles] = useState<Role[]>([]);
    const account = useAccount();
    const { connect, connectAsync, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const prizeDiamond = usePrizeDiamond();
    const { handleError } = useError();
    const { data: blockNumber } = useBlockNumber({ watch: true });

    useEffect(() => {
        if (blockNumber) {
            console.log('New block:', blockNumber.toString());
        }
    }, [blockNumber]);

    const { data: prizesData, refetch: refetchPrizesQuery, isLoading: isPrizesQueryLoading, error: prizesError } = useQuery({
        queryKey: ['initialPrizes'],
        queryFn: async () => {
            if (!prizeDiamond.getPrizeCount || !prizeDiamond.getPrizes) {
                throw new Error('PrizeDiamond not fully initialized');
            }
            console.log('Fetching prizes...');
            setIsPrizesLoading(true);
            try {
                // Add a small delay to ensure the node has updated
                await new Promise(resolve => setTimeout(resolve, 1000));
                const count = await prizeDiamond.getPrizeCount();
                console.log('Prize count:', count);
                const prizes = await prizeDiamond.getPrizes(0n, BigInt(count));
                console.log('Fetched prizes:', prizes);
                return prizes;
            } finally {
                setIsPrizesLoading(false);
                setIsLoading(false);
            }
        },
        staleTime: 30000, // Consider data fresh for 30 seconds
        enabled: !!prizeDiamond.getPrizeCount && !!prizeDiamond.getPrizes,
    });

    useEffect(() => {
        if (prizesError) {
            handleError('Error fetching prizes', prizesError as Error);
        }
    }, [prizesError, handleError]);

    const refetchPrizes = useCallback(async () => {
        console.log('Manually refetching prizes...');
        const result = await refetchPrizesQuery();
        console.log('Refetch result:', result);
    }, [refetchPrizesQuery]);

    useEffect(() => {
        console.log('Current prizes:', prizesData);
    }, [prizesData]);

    const memoizedConnect = useCallback(async () => {
        if (connectors.length > 0) {
            await connect({ connector: connectors[0] });
        }
    }, [connect, connectors]);

    const memoizedDisconnect = useCallback(async () => {
        await disconnect();
    }, [disconnect]);

    const memoizedGetPrizeDetails = useCallback((prizeId: bigint) => prizeDiamond.getPrizeDetails(prizeId), [prizeDiamond]);

    const contextValue = useMemo<AppContextType>(() => ({
        account,
        connect: memoizedConnect,
        disconnect: memoizedDisconnect,
        publicClient,
        walletClient,
        contracts: config.contracts,
        prizeDiamond: {
            ...prizeDiamond,
            contracts: config.contracts,
            getPrizeCount: async () => prizeDiamond.prizeCount,
            areAllRewardsClaimed: prizeDiamond.areAllRewardsClaimed,
            createPrize: prizeDiamond.createPrize,
            createPrizeAsync: prizeDiamond.createPrizeAsync,
            getPrizeDetails: memoizedGetPrizeDetails,
        },
        isLoading: isLoading || isPrizesLoading, // Combine both loading states
        isPrizesLoading,
        setIsLoading,
        prizes: prizesData || [],
        userRoles,
        setUserRoles,
        blockNumber: blockNumber ? Number(blockNumber) : undefined,
        refetchPrizes,
    }), [
        account,
        memoizedConnect,
        memoizedDisconnect,
        publicClient,
        walletClient,
        prizeDiamond,
        isLoading,
        isPrizesLoading,
        prizesData,
        userRoles,
        blockNumber,
        refetchPrizes,
        memoizedGetPrizeDetails,
    ]);

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};