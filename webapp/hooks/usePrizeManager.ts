import { useCallback, useEffect, useState } from 'react';
import { parseEther } from 'viem';
import { usePublicClient, useReadContract, useWalletClient, useWriteContract } from 'wagmi';
import { useError } from '../app/ErrorContext';
import { Prize, RawPrizeData } from '../app/types';
import { config } from '../config';

export const usePrizeManager = () => {
    const { handleError } = useError();
    const publicClient = usePublicClient();
    const { data: walletClient, isLoading: isWalletLoading } = useWalletClient();
    const [prizes, setPrizes] = useState<Prize[]>([]);

    const typedReadContract = useCallback(async <T>(
        config: Parameters<typeof publicClient.readContract>[0]
    ): Promise<T> => {
        if (!publicClient) throw new Error('Public client is not available');
        return publicClient.readContract(config) as Promise<T>;
    }, [publicClient]);

    useEffect(() => {
        console.log('[PrizeManager] Wallet client updated:', walletClient ? 'Available' : 'Not available');
        console.log('[PrizeManager] Wallet loading:', isWalletLoading);
    }, [walletClient, isWalletLoading]);

    const { data: allPrizesData, refetch: refetchAllPrizes } = useReadContract({
        ...config.contracts.PrizeManager,
        functionName: 'getAllPrizes',
    });

    useEffect(() => {
        console.log('[PrizeManager] allPrizesData updated:', allPrizesData);
    }, [allPrizesData]);

    const { writeContractAsync } = useWriteContract();

    const [prizeUpdateTrigger, setPrizeUpdateTrigger] = useState(0);

    const formatPrize = useCallback((rawPrize: any): Prize => {
        console.log('[PrizeManager] Formatting prize:', rawPrize);
        return {
            id: rawPrize.addr,
            prizeAddress: rawPrize.addr,
            name: rawPrize.name,
            description: rawPrize.description,
            pool: BigInt(rawPrize.pool),
            status: rawPrize.status,
            allocationStrategy: rawPrize.allocationStrategy,
            criteriaNames: rawPrize.criteriaNames,
            createdAt: new Date(Number(rawPrize.createdAt) * 1000),
            organizer: rawPrize.organizer,
        };
    }, []);

    const safeContractCall = useCallback(async <T>(
        operation: () => Promise<T>,
        errorContext: string
    ): Promise<T | null> => {
        try {
            console.log(`[PrizeManager] Attempting operation: ${errorContext}`);
            const result = await operation();
            console.log(`[PrizeManager] Operation successful: ${errorContext}`, result);
            return result;
        } catch (error: any) {
            console.error(`[PrizeManager] ${errorContext} - Detailed error:`, error);
            if (error.message.includes('InvalidInput')) {
                handleError(errorContext, 'Invalid input parameters');
            } else if (error.message.includes('InvalidAllocationStrategy')) {
                handleError(errorContext, 'Invalid allocation strategy');
            } else if (error.message.includes('PrizeNotFound')) {
                handleError(errorContext, 'Prize not found');
            } else if (error.message.includes('Unauthorized')) {
                handleError(errorContext, 'Unauthorized action');
            } else {
                handleError(errorContext, error);
            }
            return null;
        }
    }, [handleError]);

    const getAllPrizes = useCallback(async (page: number = 1, pageSize: number = 50, forceRefresh: boolean = false): Promise<{ prizes: Prize[], totalCount: number } | null> => {
        console.log(`[PrizeManager] Getting all prizes. Page: ${page}, PageSize: ${pageSize}, ForceRefresh: ${forceRefresh}`);
        return safeContractCall(async () => {
            if (!publicClient) throw new Error('Public client is not available');

            if (!forceRefresh && prizes.length > 0) {
                console.log(`[PrizeManager] Using cached prizes`);
                const startIndex = (page - 1) * pageSize;
                const endIndex = Math.min(prizes.length, page * pageSize);
                return { prizes: prizes.slice(startIndex, endIndex), totalCount: prizes.length };
            }

            const totalCount = await typedReadContract<bigint>({
                address: config.contracts.PrizeManager.address,
                abi: config.contracts.PrizeManager.abi,
                functionName: 'getPrizeCount',
            });

            console.log(`[PrizeManager] Total prize count:`, totalCount);

            const prizeCount = Number(totalCount);
            if (prizeCount === 0) {
                setPrizes([]);
                return { prizes: [], totalCount: 0 };
            }

            const fetchedPrizes: Prize[] = [];
            for (let i = 0; i < prizeCount; i++) {
                try {
                    const prizeDetails = await typedReadContract<RawPrizeData>({
                        address: config.contracts.PrizeManager.address,
                        abi: config.contracts.PrizeManager.abi,
                        functionName: 'getPrizeDetails',
                        args: [BigInt(i)],
                    });
                    fetchedPrizes.push(formatPrize(prizeDetails));
                } catch (error) {
                    console.error(`[PrizeManager] Failed to fetch prize at index ${i}:`, error);
                }
            }

            console.log(`[PrizeManager] Fetched prizes:`, fetchedPrizes);
            setPrizes(fetchedPrizes);

            const startIndex = (page - 1) * pageSize;
            const endIndex = Math.min(prizeCount, page * pageSize);
            return { prizes: fetchedPrizes.slice(startIndex, endIndex), totalCount: prizeCount };
        }, "Failed to get prizes") ?? { prizes: [], totalCount: 0 };
    }, [publicClient, formatPrize, safeContractCall, setPrizes, prizes]);

    const createPrize = useCallback(async (
        name: string,
        description: string,
        totalRewardPool: string,
        allocationStrategy: string,
        criteriaNames: string[]
    ): Promise<Prize | null> => {
        console.log(`[PrizeManager] Creating prize: ${name}`);
        if (!walletClient) {
            console.error('[PrizeManager] Wallet is not connected');
            throw new Error('Wallet is not connected. Please connect your wallet first.');
        }

        const parsedRewardPool = parseEther(totalRewardPool);

        return safeContractCall(async () => {
            if (!publicClient) {
                throw new Error('Public client is not available');
            }

            const { request } = await publicClient.simulateContract({
                account: walletClient.account,
                address: config.contracts.PrizeManager.address,
                abi: config.contracts.PrizeManager.abi,
                functionName: 'createPrize',
                args: [{
                    name,
                    desc: description,
                    pool: parsedRewardPool,
                    strategy: allocationStrategy,
                    criteria: criteriaNames
                }],
            });

            const hash = await walletClient.writeContract(request);
            console.log(`[PrizeManager] Prize created. Transaction hash:`, hash);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            // Wait for blockchain to update and fetch the new prize
            await new Promise(resolve => setTimeout(resolve, 5000));
            const result = await getAllPrizes(1, 1);
            if (!result) {
                throw new Error('Failed to fetch prizes');
            }
            const { totalCount } = result;
            const { prizes: newPrizes } = await getAllPrizes(Math.ceil(Number(totalCount) / 50), 50) || { prizes: [] };

            const createdPrize = newPrizes.find(prize => prize.name === name && prize.description === description);
            if (!createdPrize) {
                throw new Error('Failed to find the created prize');
            }

            console.log(`[PrizeManager] New prize fetched:`, createdPrize);
            return createdPrize;
        }, "Failed to create prize");
    }, [walletClient, publicClient, getAllPrizes, safeContractCall]);

    const assignCriteriaWeights = useCallback(async (prizeAddress: string, weights: number[]): Promise<boolean | null> => {
        console.log(`[PrizeManager] Assigning criteria weights for prize: ${prizeAddress}`);
        return safeContractCall(async () => {
            if (!publicClient || !walletClient) {
                throw new Error('Web3 not initialized');
            }

            const { request } = await publicClient.simulateContract({
                account: walletClient.account,
                address: prizeAddress as `0x${string}`,
                abi: config.contracts.PrizeContract.abi,
                functionName: 'assignCriteriaWeights',
                args: [weights],
            });

            const hash = await writeContractAsync(request);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`[PrizeManager] Criteria weights assigned for prize: ${prizeAddress}`);
            return true;
        }, "Failed to assign criteria weights");
    }, [publicClient, walletClient, safeContractCall, writeContractAsync]);

    const fundPrize = useCallback(async (prizeAddress: string): Promise<boolean | null> => {
        console.log(`[PrizeManager] Funding prize: ${prizeAddress}`);
        return safeContractCall(async () => {
            if (!publicClient || !walletClient) {
                throw new Error('Web3 not initialized');
            }

            const prizeDetails = await typedReadContract<RawPrizeData>({
                address: config.contracts.PrizeManager.address,
                abi: config.contracts.PrizeManager.abi,
                functionName: 'getPrizeDetails',
                args: [prizeAddress],
            });

            if (!prizeDetails) {
                throw new Error('Failed to fetch prize details');
            }

            const { request } = await publicClient.simulateContract({
                account: walletClient.account,
                address: prizeAddress as `0x${string}`,
                abi: config.contracts.PrizeContract.abi,
                functionName: 'fundPrize',
                value: BigInt(prizeDetails.pool),
            });

            const hash = await writeContractAsync(request);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`[PrizeManager] Prize funded: ${prizeAddress}`);
            return true;
        }, "Failed to fund prize");
    }, [publicClient, walletClient, safeContractCall, writeContractAsync]);

    const moveToNextState = useCallback(async (prizeAddress: string): Promise<boolean | null> => {
        console.log(`[PrizeManager] Moving prize to next state: ${prizeAddress}`);
        return safeContractCall(async () => {
            if (!publicClient || !walletClient) {
                throw new Error('Web3 not initialized');
            }

            const { request } = await publicClient.simulateContract({
                account: walletClient.account,
                address: prizeAddress as `0x${string}`,
                abi: config.contracts.PrizeContract.abi,
                functionName: 'moveToNextState',
            });

            const hash = await writeContractAsync(request);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`[PrizeManager] Prize moved to next state: ${prizeAddress}`);
            return true;
        }, "Failed to move prize to next state");
    }, [publicClient, walletClient, safeContractCall, writeContractAsync]);

    const getPrize = useCallback(async (prizeAddress: string): Promise<Prize | null> => {
        console.log(`[PrizeManager] Getting prize details for address: ${prizeAddress}`);
        return safeContractCall(async () => {
            if (!publicClient) throw new Error('Public client is not available');

            try {
                console.log(`[PrizeManager] Attempting to fetch prize details for address: ${prizeAddress}`);
                const prizeCount = await typedReadContract<bigint>({
                    address: config.contracts.PrizeManager.address,
                    abi: config.contracts.PrizeManager.abi,
                    functionName: 'getPrizeCount',
                });

                for (let i = 0; i < Number(prizeCount); i++) {
                    const prizeDetails = await typedReadContract<RawPrizeData>({
                        address: config.contracts.PrizeManager.address,
                        abi: config.contracts.PrizeManager.abi,
                        functionName: 'getPrizeDetails',
                        args: [BigInt(i)],
                    });

                    if (prizeDetails.addr.toLowerCase() === prizeAddress.toLowerCase()) {
                        console.log(`[PrizeManager] Found matching prize at index ${i}`);
                        return formatPrize(prizeDetails);
                    }
                }

                console.log(`[PrizeManager] No matching prize found for address: ${prizeAddress}`);
                return null;
            } catch (error: any) {
                console.error(`[PrizeManager] Error in getPrize:`, error);
                throw error;
            }
        }, "Failed to get prize");
    }, [publicClient, formatPrize, safeContractCall]);

    const refreshPrize = useCallback(async (prizeAddress: string) => {
        console.log(`[PrizeManager] Refreshing prize: ${prizeAddress}`);
        const prize = await getPrize(prizeAddress);
        console.log(`[PrizeManager] Refreshed prize:`, prize);
        return prize;
    }, [getPrize]);

    const deactivatePrize = useCallback(async (prizeAddress: string): Promise<boolean> => {
        console.log(`[PrizeManager] Deactivating prize: ${prizeAddress}`);
        const result = await safeContractCall(async () => {
            if (!publicClient) throw new Error('Public client is not available');

            const prize = await getPrize(prizeAddress);
            if (!prize) throw new Error('Invalid prize address');

            const hash = await writeContractAsync({
                address: config.contracts.PrizeManager.address,
                abi: config.contracts.PrizeManager.abi,
                functionName: 'deactivatePrize',
                args: [prizeAddress],
            });

            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`[PrizeManager] Prize deactivated: ${prizeAddress}`);
            return true;
        }, "Failed to deactivate prize");

        if (result) {
            await refreshPrize(prizeAddress);
        }
        console.log(`[PrizeManager] Deactivate prize result: ${result}`);
        return result || false;
    }, [writeContractAsync, getPrize, publicClient, safeContractCall]);

    const listenForPrizeEvents = useCallback(() => {
        if (!publicClient) {
            console.log('[PrizeManager] Public client not available, skipping event listeners');
            return;
        }

        console.log('[PrizeManager] Setting up event listeners');

        const unwatch = publicClient.watchContractEvent({
            address: config.contracts.PrizeManager.address,
            abi: config.contracts.PrizeManager.abi,
            eventName: 'PrizeCreated',
            onLogs: (logs) => {
                console.log('[PrizeManager] Prize created event:', logs);
                refetchAllPrizes();
                setPrizeUpdateTrigger(prev => prev + 1);
            },
        });

        const unwatchDeactivate = publicClient.watchContractEvent({
            address: config.contracts.PrizeManager.address,
            abi: config.contracts.PrizeManager.abi,
            eventName: 'PrizeDeactivated',
            onLogs: (logs) => {
                console.log('[PrizeManager] Prize deactivated event:', logs);
                refetchAllPrizes();
                setPrizeUpdateTrigger(prev => prev + 1);
            },
        });

        return () => {
            console.log('[PrizeManager] Removing event listeners');
            unwatch();
            unwatchDeactivate();
        };
    }, [publicClient, refetchAllPrizes]);

    useEffect(() => {
        console.log('[PrizeManager] Setting up prize event listeners');
        const unsubscribe = listenForPrizeEvents();
        return () => {
            console.log('[PrizeManager] Cleaning up prize event listeners');
            if (unsubscribe) unsubscribe();
        };
    }, [listenForPrizeEvents]);

    const getPrizeState = useCallback(async (prizeAddress: string): Promise<number | null> => {
        console.log(`[PrizeManager] Getting prize state for address: ${prizeAddress}`);
        return safeContractCall(async () => {
            if (!publicClient) throw new Error('Public client is not available');

            const state = await publicClient.readContract({
                address: prizeAddress as `0x${string}`,
                abi: config.contracts.PrizeContract.abi,
                functionName: 'state',
            });

            console.log(`[PrizeManager] Prize state: ${Number(state)}`);
            return Number(state);
        }, "Failed to get prize state");
    }, [publicClient, safeContractCall]);

    const getUserRoles = useCallback(async (address: string, prizeAddress: string): Promise<string[]> => {
        const result = await safeContractCall(async () => {
            if (!publicClient) throw new Error('Public client is not available');

            const roles = ['DEFAULT_ADMIN_ROLE', 'EVALUATOR_ROLE', 'CONTESTANT_ROLE'];
            const userRoles = await Promise.all(roles.map(async (role) => {
                const roleHash = await publicClient.readContract({
                    address: prizeAddress as `0x${string}`,
                    abi: config.contracts.PrizeContract.abi,
                    functionName: role,
                });
                const hasRole = await publicClient.readContract({
                    address: prizeAddress as `0x${string}`,
                    abi: config.contracts.PrizeContract.abi,
                    functionName: 'hasRole',
                    args: [roleHash, address],
                });
                return hasRole ? role : null;
            }));

            return userRoles.filter((role): role is string => role !== null);
        }, "Failed to get user roles");

        return result ?? []; // Return an empty array if the result is null
    }, [publicClient, safeContractCall]);

    const addEvaluators = useCallback(async (prizeAddress: string, evaluators: string[]): Promise<boolean> => {
        console.log(`[PrizeManager] Adding evaluators to prize: ${prizeAddress}`);
        const result = await safeContractCall(async () => {
            if (!publicClient || !walletClient) throw new Error('Web3 not initialized');

            const { request } = await publicClient.simulateContract({
                account: walletClient.account,
                address: prizeAddress as `0x${string}`,
                abi: config.contracts.PrizeContract.abi,
                functionName: 'addEvaluators',
                args: [evaluators],
            });

            const hash = await writeContractAsync(request);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`[PrizeManager] Evaluators added to prize: ${prizeAddress}`);
            return true;
        }, "Failed to add evaluators");

        return result === true;
    }, [publicClient, walletClient, safeContractCall, writeContractAsync]);

    console.log('[PrizeManager] Prizes state:', prizes);

    return {
        prizes,
        createPrize,
        getPrizes: getAllPrizes,
        getPrize,
        deactivatePrize,
        refreshPrize,
        fundPrize,
        assignCriteriaWeights,
        moveToNextState,
        getPrizeState,
        prizeUpdateTrigger,
        getUserRoles,
        addEvaluators,
    };
};