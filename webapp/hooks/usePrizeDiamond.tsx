import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EncryptionTypes, PermitSigner } from "fhenixjs";
import { useCallback } from 'react';
import { Address, Hash, TypedDataParameter } from 'viem';
import { useAccount, useBlockNumber, usePublicClient, useWalletClient, useWriteContract } from 'wagmi';
import { config } from '../config';
import { AllocationStrategy, Prize, PrizeParams, State } from '../types';
import { useFhenixClient } from './useFhenixClient';

type FacetFunctions = {
    [K in keyof typeof config.contracts]: {
        [FunctionName: string]: {
            inputs: any[],
            outputs: any
        }
    }
};

export function serializeBigInt(obj: any): any {
    if (typeof obj === 'bigint') {
        return obj.toString();
    } else if (Array.isArray(obj)) {
        return obj.map(serializeBigInt);
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
        );
    }
    return obj;
}

export function deserializeBigInt(obj: any): any {
    if (typeof obj === 'string' && /^\d+n$/.test(obj)) {
        return BigInt(obj.slice(0, -1));
    } else if (Array.isArray(obj)) {
        return obj.map(deserializeBigInt);
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => {
                if (key === 'allocationStrategy') {
                    // Ensure allocationStrategy is treated as a number
                    return [key, Number(value)];
                }
                return [key, deserializeBigInt(value)];
            })
        );
    }
    return obj;
}

export const usePrizeDiamond = () => {
    const { address } = useAccount();
    const queryClient = useQueryClient();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const { writeContractAsync } = useWriteContract();

    const diamondAddress = config.contracts.Diamond.address;

    const { getFheClient } = useFhenixClient(diamondAddress);

    const { data: blockNumber } = useBlockNumber({ watch: true });

    const readDiamond = useCallback(async <
        F extends keyof FacetFunctions,
        Fn extends keyof FacetFunctions[F] & string
    >(
        facetName: F,
        functionName: Fn,
        args?: any[]
    ): Promise<any> => {
        if (!publicClient) throw new Error('Public client not found');
        try {
            const result = await publicClient.readContract({
                address: diamondAddress,
                abi: config.contracts[facetName].abi,
                functionName,
                args,
            });
            return serializeBigInt(result);
        } catch (error) {
            console.error(`Error reading diamond function: ${functionName}`, error);
            throw error;
        }
    }, [publicClient, diamondAddress]);

    const writeDiamond = useCallback(async (facetName: keyof typeof config.contracts, functionName: string, args?: any[], value?: bigint): Promise<Hash> => {
        if (!writeContractAsync) throw new Error('Write contract function not found');
        try {
            return await writeContractAsync({
                address: diamondAddress,
                abi: config.contracts[facetName].abi,
                functionName,
                args,
                value,
            });
        } catch (error) {
            console.error(`Error writing to diamond function: ${functionName}`, error);
            throw error;
        }
    }, [writeContractAsync, diamondAddress]);

    const waitForTransaction = useCallback(async (hash: `0x${string}`) => {
        if (!publicClient) throw new Error('Public client not found');
        return publicClient.waitForTransactionReceipt({ hash });
    }, [publicClient]);

    // PrizeManagerFacet functions
    const { data: prizeCount = 0 } = useQuery({
        queryKey: ['prizeCount', blockNumber ? blockNumber.toString() : undefined],
        queryFn: async () => {
            const count = await readDiamond('PrizeManagerFacet', 'getPrizeCount');
            return Number(count); // Convert BigInt to number
        },
    });

    const getPrizeCount = useCallback(async () => {
        const count = await readDiamond('PrizeManagerFacet', 'getPrizeCount');
        console.log('Current prize count:', count);
        return Number(count); // Ensure this returns a number
    }, [readDiamond]);

    const createPrizeMutation = useMutation({
        mutationFn: async (params: PrizeParams) => {
            console.log("Creating prize with params:", params);
            const prizeParams = {
                name: params.name,
                description: params.description,
                pool: params.monetaryRewardPool,
                criteria: params.criteria,
                criteriaWeights: params.criteriaWeights,
                strategy: params.allocationStrategy
            };
            try {
                const result = await writeDiamond('PrizeManagerFacet', 'createPrize', [prizeParams]);
                console.log('Prize creation result:', result);
                return result;
            } catch (error) {
                console.error('Detailed error:', error);
                throw error;
            }
        },
        onSuccess: () => {
            console.log('Prize created successfully, invalidating queries...');
            queryClient.invalidateQueries({ queryKey: ['prizeCount'] });
            queryClient.invalidateQueries({ queryKey: ['initialPrizes'] });
        },
    });

    const getPrizeDetails = useCallback(async (prizeId: bigint) => {
        try {
            const result = await readDiamond('PrizeManagerFacet', 'getPrizeDetails', [prizeId]);
            console.log('Raw prize details:', result);
            const deserializedResult = deserializeBigInt(result);
            return {
                ...deserializedResult,
                fundedAmount: BigInt(deserializedResult.fundedAmount || 0),
                monetaryRewardPool: BigInt(deserializedResult.monetaryRewardPool || 0),
                allocationStrategy: deserializedResult.strategy as AllocationStrategy
            } as Prize;
        } catch (error) {
            console.error('Error fetching prize details:', error);
            throw error; // Rethrow the error to be caught by the query
        }
    }, [readDiamond]);

    const getPrizes = useCallback(async (startIndex: bigint, count: bigint): Promise<Prize[]> => {
        try {
            const prizeCount = await getPrizeCount();

            if (prizeCount === 0) {
                console.log('No prizes available');
                return [];
            }

            const result = await readDiamond('PrizeManagerFacet', 'getPrizes', [startIndex, count]);
            console.log('Raw prize data:', result);

            if (!result || result.length === 0) {
                return [];
            }

            return result.map((prize: any): Prize => ({
                id: prize.id?.toString() ?? '0',
                organizer: prize.organizer ?? '0x0000000000000000000000000000000000000000',
                name: prize.name ?? '',
                description: prize.description ?? '',
                createdAt: BigInt(prize.createdAt ?? 0),
                monetaryRewardPool: BigInt(prize.monetaryRewardPool ?? 0),
                fundedAmount: BigInt(prize.fundedAmount ?? 0),
                criteriaNames: prize.criteriaNames ?? [],
                criteriaWeights: prize.criteriaWeights?.map(Number) ?? [],
                allocationStrategy: prize.allocationStrategy ?? AllocationStrategy.Invalid,
                state: prize.state ?? State.Setup,
                rewardsAllocated: prize.rewardsAllocated ?? false,
                evaluatedContributionsCount: Number(prize.evaluatedContributionsCount ?? 0),
                claimedRewardsCount: Number(prize.claimedRewardsCount ?? 0),
                contributionCount: Number(prize.contributionCount ?? 0),
                totalScore: BigInt(prize.totalScore ?? 0),
                lastProcessedIndex: Number(prize.lastProcessedIndex ?? 0),
                address: prize.address ?? '0x0000000000000000000000000000000000000000',
            }));
        } catch (error) {
            console.error('Error fetching prizes:', error);
            return [];
        }
    }, [readDiamond, getPrizeCount]);

    // PrizeStateFacet functions
    const getState = useCallback((prizeId: bigint) =>
        readDiamond('PrizeStateFacet', 'getState', [prizeId]), [readDiamond]);

    const moveToNextStateMutation = useMutation({
        mutationFn: async (prizeId: bigint) => {
            const txHash = await writeDiamond('PrizeStateFacet', 'moveToNextState', [prizeId]);
            await waitForTransaction(txHash);
            return txHash;
        },
        onSuccess: (_, prizeId) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const updateClaimStatusMutation = useMutation({
        mutationFn: (prizeId: bigint) =>
            writeDiamond('PrizeStateFacet', 'updateClaimStatus', [prizeId]),
        onSuccess: (_, prizeId) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    // PrizeACLFacet functions
    const addPrizeEvaluatorMutation = useMutation({
        mutationFn: ({ prizeId, evaluator }: { prizeId: bigint, evaluator: Address }) =>
            writeDiamond('PrizeACLFacet', 'addPrizeEvaluator', [prizeId, evaluator]),
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const addEvaluatorsMutation = useMutation({
        mutationFn: ({ prizeId, evaluators }: { prizeId: bigint, evaluators: Address[] }) =>
            writeDiamond('PrizeACLFacet', 'addEvaluators', [prizeId, evaluators]),
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const removePrizeEvaluatorMutation = useMutation({
        mutationFn: ({ prizeId, evaluator }: { prizeId: bigint, evaluator: Address }) =>
            writeDiamond('PrizeACLFacet', 'removePrizeEvaluator', [prizeId, evaluator]),
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const removeEvaluatorsMutation = useMutation({
        mutationFn: ({ prizeId, evaluators }: { prizeId: bigint, evaluators: Address[] }) =>
            writeDiamond('PrizeACLFacet', 'removeEvaluators', [prizeId, evaluators]),
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const isEvaluator = useCallback((prizeId: bigint, evaluator: Address) =>
        readDiamond('PrizeACLFacet', 'isEvaluator', [prizeId, evaluator]), [readDiamond]);

    const isPrizeOrganizer = useCallback((prizeId: bigint, account: Address) =>
        readDiamond('PrizeACLFacet', 'isPrizeOrganizer', [prizeId, account]), [readDiamond]);

    const isPrizeEvaluator = useCallback((prizeId: bigint, account: Address) =>
        readDiamond('PrizeACLFacet', 'isPrizeEvaluator', [prizeId, account]), [readDiamond]);

    const getPrizeEvaluatorCount = useCallback((prizeId: bigint) =>
        readDiamond('PrizeACLFacet', 'getPrizeEvaluatorCount', [prizeId]), [readDiamond]);

    // PrizeContributionFacet functions
    const submitContributionMutation = useMutation({
        mutationFn: async ({ prizeId, description }: { prizeId: bigint, description: string }) => {
            const txHash = await writeDiamond('PrizeContributionFacet', 'submitContribution', [prizeId, description]);
            return txHash;
        },
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const getContributionCount = useCallback((prizeId: bigint) =>
        readDiamond('PrizeContributionFacet', 'getContributionCount', [prizeId]), [readDiamond]);

    const getContribution = useCallback((prizeId: bigint, contributionId: bigint) =>
        readDiamond('PrizeContributionFacet', 'getContribution', [prizeId, contributionId]), [readDiamond]);

    const getContributionByIndex = useCallback((prizeId: bigint, index: bigint) =>
        readDiamond('PrizeContributionFacet', 'getContributionByIndex', [prizeId, index]), [readDiamond]);

    const getContributionIdsForContestant = useCallback((prizeId: bigint, contestant: Address) =>
        readDiamond('PrizeContributionFacet', 'getContributionIdsForContestant', [prizeId, contestant]), [readDiamond]);

    // PrizeEvaluationFacet functions
    const encryptScores = useCallback(async (scores: number[]) => {
        try {
            const fheClient = await getFheClient();
            return Promise.all(scores.map(score => fheClient.encrypt(score, EncryptionTypes.uint32)));
        } catch (error) {
            console.error('Failed to encrypt scores:', error);
            throw error;
        }
    }, [getFheClient]);

    const decryptReward = useCallback(async (encryptedReward: string) => {
        try {
            const fheClient = await getFheClient();
            return fheClient.unseal(diamondAddress, encryptedReward);
        } catch (error) {
            console.error('Failed to decrypt reward:', error);
            throw error;
        }
    }, [getFheClient, diamondAddress]);

    const assignScoresForContestantMutation = useMutation({
        mutationFn: async ({ prizeId, contestant, scores }: { prizeId: bigint, contestant: Address, scores: number[] }) => {
            const encryptedScores = await encryptScores(scores);
            return writeDiamond('PrizeEvaluationFacet', 'assignScoresForContestant', [prizeId, contestant, encryptedScores]);
        },
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const getEvaluationCount = useCallback((prizeId: bigint, contestant: Address) =>
        readDiamond('PrizeEvaluationFacet', 'getEvaluationCount', [prizeId, contestant]), [readDiamond]);

    const hasEvaluatorScoredContestant = useCallback((prizeId: bigint, evaluator: Address, contestant: Address) =>
        readDiamond('PrizeEvaluationFacet', 'hasEvaluatorScoredContestant', [prizeId, evaluator, contestant]), [readDiamond]);

    const assignCriteriaWeightsMutation = useMutation({
        mutationFn: async ({ prizeId, weights }: { prizeId: bigint, weights: number[] }) => {
            const txHash = await writeDiamond('PrizeEvaluationFacet', 'assignCriteriaWeights', [prizeId, weights]);
            await waitForTransaction(txHash);
            return txHash;
        },
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const getCriteriaWeights = useCallback((prizeId: bigint) =>
        readDiamond('PrizeEvaluationFacet', 'getCriteriaWeights', [prizeId]), [readDiamond]);

    // PrizeFundingFacet functions
    const fundTotallyMutation = useMutation({
        mutationFn: async ({ prizeId, amount }: { prizeId: bigint, amount: bigint }) => {
            const txHash = await writeDiamond('PrizeFundingFacet', 'fundTotally', [prizeId], amount);
            await waitForTransaction(txHash);
            return txHash;
        },
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    // PrizeRewardFacet functions
    const allocateRewardsBatchMutation = useMutation({
        mutationFn: ({ prizeId, batchSize }: { prizeId: bigint, batchSize: bigint }) =>
            writeDiamond('PrizeRewardFacet', 'allocateRewardsBatch', [prizeId, batchSize]),
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const computeContestantClaimRewardMutation = useMutation({
        mutationFn: (prizeId: bigint) =>
            writeDiamond('PrizeRewardFacet', 'computeContestantClaimReward', [prizeId]),
        onSuccess: (_, prizeId) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const viewContestantClaimReward = useCallback(async (prizeId: bigint) => {
        if (!walletClient) throw new Error('Wallet client not initialized');

        try {
            const fheClient = await getFheClient();

            const permitSigner: PermitSigner = {
                getAddress: async () => walletClient.account.address,
                signTypedData: async (domain, types: Record<string, TypedDataParameter[]>, value: Record<string, unknown>) =>
                    walletClient.signTypedData({
                        domain,
                        types,
                        primaryType: 'Permit',
                        message: value
                    })
            };

            const permit = await fheClient.generatePermit(diamondAddress, publicClient, permitSigner);
            fheClient.storePermit(permit);
            const permission = fheClient.extractPermitPermission(permit);
            const sealedResult = await readDiamond('PrizeRewardFacet', 'viewContestantClaimReward', [prizeId, permission]);
            return decryptReward(sealedResult as string);
        } catch (error) {
            console.error('Failed to view contestant claim reward:', error);
            throw error;
        }
    }, [getFheClient, diamondAddress, publicClient, walletClient, readDiamond, decryptReward]);

    const areAllRewardsClaimed = useCallback((prizeId: bigint) =>
        readDiamond('PrizeRewardFacet', 'areAllRewardsClaimed', [prizeId]), [readDiamond]);

    // PrizeStrategyFacet functions
    const getAllocationStrategy = useCallback(async (prizeId: bigint) => {
        const result = await readDiamond('PrizeStrategyFacet', 'getAllocationStrategy', [prizeId]);
        console.log('Raw allocation strategy:', result);
        const strategyNumber = Number(result);
        return strategyNumber as AllocationStrategy;
    }, [readDiamond]);

    const setAllocationStrategyMutation = useMutation({
        mutationFn: ({ prizeId, strategy }: { prizeId: bigint, strategy: number }) =>
            writeDiamond('PrizeStrategyFacet', 'setAllocationStrategy', [prizeId, strategy]),
        onSuccess: (_, { prizeId }) => {
            queryClient.invalidateQueries({ queryKey: ['prizes', prizeId] });
        },
    });

    const getAllAllocationStrategies = useCallback(() =>
        readDiamond('PrizeStrategyFacet', 'getAllAllocationStrategies'), [readDiamond]);

    return {
        prizeCount,
        getPrizeCount,
        createPrize: createPrizeMutation.mutate,
        createPrizeAsync: createPrizeMutation.mutateAsync,
        getPrizeDetails,
        getPrizes,
        getState,
        moveToNextState: moveToNextStateMutation.mutateAsync,
        updateClaimStatus: updateClaimStatusMutation.mutate,
        addPrizeEvaluator: addPrizeEvaluatorMutation.mutate,
        addEvaluators: addEvaluatorsMutation.mutate,
        removePrizeEvaluator: removePrizeEvaluatorMutation.mutate,
        removeEvaluators: removeEvaluatorsMutation.mutate,
        isPrizeOrganizer,
        isPrizeEvaluator,
        getPrizeEvaluatorCount,
        submitContribution: submitContributionMutation.mutateAsync,
        getContributionCount,
        getContribution,
        getContributionByIndex,
        getContributionIdsForContestant,
        assignScoresForContestant: assignScoresForContestantMutation.mutate,
        getEvaluationCount,
        hasEvaluatorScoredContestant,
        fundTotally: fundTotallyMutation.mutate,
        fundTotallyAsync: fundTotallyMutation.mutateAsync,
        allocateRewardsBatch: allocateRewardsBatchMutation.mutate,
        computeContestantClaimReward: computeContestantClaimRewardMutation.mutate,
        getAllocationStrategy,
        setAllocationStrategy: setAllocationStrategyMutation.mutate,
        getAllAllocationStrategies,
        isEvaluator,
        assignCriteriaWeights: assignCriteriaWeightsMutation.mutateAsync,
        getCriteriaWeights,
        encryptScores,
        decryptReward,
        viewContestantClaimReward,
        areAllRewardsClaimed,
        blockNumber: blockNumber ? Number(blockNumber) : undefined,
        waitForTransaction,
    };
};