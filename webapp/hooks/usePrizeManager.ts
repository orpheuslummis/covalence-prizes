import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Address } from 'viem';
import { usePublicClient, useWatchContractEvent, useWriteContract } from 'wagmi';
import { Prize, PrizeParams, RawPrizeData, State } from '../app/types';
import { config } from '../config';
import { useError } from './useError';

export const usePrizeManager = () => {
    const queryClient = useQueryClient();
    const { handleError } = useError();
    const publicClient = usePublicClient();

    const prizeManagerConfig = useMemo(() => ({
        ...config.contracts.PrizeManager,
    }), []);

    const readPrizeManagerContract = useCallback(async (functionName: string, args?: any[]) => {
        try {
            const data = await publicClient.readContract({
                ...prizeManagerConfig,
                functionName,
                args,
            });
            return data;
        } catch (error) {
            handleError(`Error reading contract function: ${functionName}`, error as Error);
            throw error;
        }
    }, [publicClient, prizeManagerConfig, handleError]);

    const { data: prizeCount = 0n, isLoading: isLoadingPrizeCount } = useQuery({
        queryKey: ['prizeCount'],
        queryFn: () => readPrizeManagerContract('getPrizeCount') as Promise<bigint>,
        staleTime: 30000, // 30 seconds
    });

    const { data: owner } = useQuery({
        queryKey: ['prizeManagerOwner'],
        queryFn: () => readPrizeManagerContract('owner') as Promise<Address>,
        staleTime: 3600000, // 1 hour
    });

    const prizeCountNumber = useMemo(() => Number(prizeCount), [prizeCount]);

    const formatPrize = useCallback((rawPrize: RawPrizeData): Prize => ({
        id: rawPrize.addr,
        prizeAddress: rawPrize.addr,
        name: rawPrize.name,
        description: rawPrize.description,
        pool: rawPrize.pool,
        status: rawPrize.status as State,
        allocationStrategy: rawPrize.allocationStrategy,
        criteriaNames: rawPrize.criteriaNames,
        createdAt: new Date(Number(rawPrize.createdAt) * 1000),
        organizer: rawPrize.organizer,
    }), []);

    const fetchPrizeDetails = useCallback(async (id: string | number) => {
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                let index: number;
                if (typeof id === 'string' && id.startsWith('0x')) {
                    const currentPrizeCount = await readPrizeManagerContract('getPrizeCount') as bigint;
                    for (let i = 0; i < Number(currentPrizeCount); i++) {
                        const prize = await readPrizeManagerContract('getPrizeDetails', [i]);
                        if (prize.addr.toLowerCase() === id.toLowerCase()) {
                            index = i;
                            break;
                        }
                    }
                    if (index === undefined) {
                        retries++;
                        continue; // Retry if not found
                    }
                } else {
                    index = Number(id);
                }
                const data = await readPrizeManagerContract('getPrizeDetails', [index]);
                return formatPrize(data as RawPrizeData);
            } catch (error) {
                retries++;
                if (retries === maxRetries) {
                    console.error(`Error fetching prize details for ID ${id}:`, error);
                    handleError(`Failed to fetch prize details for ID ${id}`, error as Error);
                    return null;
                }
            }
        }
    }, [readPrizeManagerContract, formatPrize, handleError]);

    const usePrizeDetails = (id: string | number) => useQuery({
        queryKey: ['prizeDetails', id],
        queryFn: () => fetchPrizeDetails(id),
        retry: false,
        staleTime: 30000, // 30 seconds
    });

    const fetchPrizes = useCallback(async (page: number, perPage: number) => {
        try {
            console.log('Fetching prizes for page:', page, 'perPage:', perPage);
            const currentPrizeCount = await readPrizeManagerContract('getPrizeCount') as bigint;
            console.log('Current prize count:', currentPrizeCount.toString());
            const currentPrizeCountNumber = Number(currentPrizeCount);
            const startIndex = (page - 1) * perPage;
            const endIndex = Math.min(startIndex + perPage, currentPrizeCountNumber);
            console.log('Fetching prizes from index', startIndex, 'to', endIndex);
            const prizePromises = [];
            for (let i = startIndex; i < endIndex; i++) {
                prizePromises.push(readPrizeManagerContract('getPrizeDetails', [i]));
            }
            const fetchedPrizes = await Promise.all(prizePromises);
            console.log('Fetched prizes:', fetchedPrizes);
            const validPrizes = fetchedPrizes
                .filter((prize): prize is RawPrizeData => prize !== null)
                .map(formatPrize);
            console.log('Formatted prizes:', validPrizes);
            return { prizes: validPrizes, totalCount: currentPrizeCountNumber };
        } catch (error) {
            console.error('Error in fetchPrizes:', error);
            handleError('Error fetching prizes', error as Error);
            throw error; // Rethrow the error to be caught by React Query
        }
    }, [readPrizeManagerContract, formatPrize, handleError]);

    const { writeContractAsync } = useWriteContract();

    const createPrizeMutation = useMutation({
        mutationFn: async (params: PrizeParams) => {
            const weiValue = BigInt(Math.floor(parseFloat(params.pool) * 1e18));
            const hash = await writeContractAsync({
                ...prizeManagerConfig,
                functionName: 'createPrize',
                args: [{
                    ...params,
                    pool: weiValue,
                }],
            });
            return hash;
        },
        onError: (error) => handleError('Error creating prize', error as Error),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prizeCount'] });
        },
    });

    const updateStrategyMutation = useMutation({
        mutationFn: async (params: { strategyName: string; strategyAddress: Address }) => {
            const { writeContract } = useWriteContract();
            await writeContract({
                ...prizeManagerConfig,
                functionName: 'updateStrategy',
                args: [params.strategyName, params.strategyAddress],
            });
        },
        onError: (error) => handleError('Error updating strategy', error as Error),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategies'] });
        },
    });

    useWatchContractEvent({
        ...prizeManagerConfig,
        eventName: 'PrizeCreated',
        listener: () => {
            queryClient.invalidateQueries({ queryKey: ['prizeCount'] });
        },
    });

    useWatchContractEvent({
        ...prizeManagerConfig,
        eventName: 'StrategyUpdated',
        listener: () => {
            queryClient.invalidateQueries({ queryKey: ['strategies'] });
        },
    });

    return {
        createPrize: createPrizeMutation,
        getPrizes: fetchPrizes,
        getPrize: usePrizeDetails,
        updateStrategy: updateStrategyMutation.mutate,
        isLoading: isLoadingPrizeCount,
        getOwner: owner,
        prizeCount: prizeCountNumber,
    };
};