import { Role } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { Address } from 'viem';
import { useAccount, useBlockNumber, useReadContract, useWatchContractEvent, useWriteContract } from 'wagmi';
import { config } from '../config';

export const usePrizeContract = (prizeAddress: Address) => {
    const { address } = useAccount();
    const queryClient = useQueryClient();

    const prizeContractConfig = useMemo(() => ({
        address: prizeAddress,
        abi: config.contracts.PrizeContract.abi,
    }), [prizeAddress]);

    const { data: prizeState, error: prizeStateError } = useReadContract({
        ...prizeContractConfig,
        functionName: 'state',
    });

    if (prizeStateError) {
        console.error('Error fetching prize state:', prizeStateError);
    }

    const { data: organizer } = useReadContract({
        ...prizeContractConfig,
        functionName: 'organizer',
    });

    const { data: name } = useReadContract({
        ...prizeContractConfig,
        functionName: 'name',
    });

    const { data: description } = useReadContract({
        ...prizeContractConfig,
        functionName: 'description',
    });

    const { data: monetaryRewardPool } = useReadContract({
        ...prizeContractConfig,
        functionName: 'monetaryRewardPool',
    });

    const { data: criteriaNames } = useReadContract({
        ...prizeContractConfig,
        functionName: 'criteriaNames',
    });

    const { data: criteriaWeights } = useReadContract({
        ...prizeContractConfig,
        functionName: 'criteriaWeights',
    });

    const { data: createdAt } = useReadContract({
        ...prizeContractConfig,
        functionName: 'createdAt',
    });

    const { data: strategy } = useReadContract({
        ...prizeContractConfig,
        functionName: 'strategy',
    });

    const getContribution = useCallback((contestant: Address) =>
        useReadContract({
            ...prizeContractConfig,
            functionName: 'contributions',
            args: [contestant],
        }),
        [prizeContractConfig]);

    const { data: userRoles, isLoading: isLoadingUserRoles } = useReadContract({
        ...prizeContractConfig,
        functionName: 'getRoles',
        args: [address],
        query: {
            enabled: !!address,
        },
    });

    const { writeContract, writeContractAsync } = useWriteContract({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['prizeContract', prizeAddress] });
            },
        },
    });

    const assignCriteriaWeights = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'assignCriteriaWeights', args }),
        [writeContract, prizeContractConfig]
    );

    const fundPrize = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'fundPrize', args }),
        [writeContract, prizeContractConfig]
    );

    const moveToNextState = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'moveToNextState', args }),
        [writeContract, prizeContractConfig]
    );

    const addEvaluators = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'addEvaluators', args }),
        [writeContract, prizeContractConfig]
    );

    const submitContribution = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'submitContribution', args }),
        [writeContract, prizeContractConfig]
    );

    const assignScores = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'assignScores', args }),
        [writeContract, prizeContractConfig]
    );

    const allocateRewards = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'allocateRewards', args }),
        [writeContract, prizeContractConfig]
    );

    const claimReward = useCallback(
        (args: any[]) => writeContract({ ...prizeContractConfig, functionName: 'claimReward', args }),
        [writeContract, prizeContractConfig]
    );

    const hasRole = useCallback(async (role: Role): Promise<boolean> => {
        if (!address) return false;
        const { data } = await useReadContract({
            ...prizeContractConfig,
            functionName: 'hasRole',
            args: [config.contracts.PrizeContract.roles[role], address],
        });
        return data ?? false;
    }, [address, prizeContractConfig]);

    const canPerformRole = useCallback((role: Role): boolean =>
        userRoles?.includes(config.contracts.PrizeContract.roles[role]) ?? false,
        [userRoles]);

    useWatchContractEvent({
        ...prizeContractConfig,
        eventName: 'StateChanged',
        listener: (logs) => {
            queryClient.invalidateQueries({ queryKey: ['prizeContract', prizeAddress] });
        },
        onError: (error) => {
            console.error('Error watching contract event:', error);
        },
    });

    const { data: blockNumber } = useBlockNumber({ watch: true });

    useEffect(() => {
        if (blockNumber) {
            queryClient.invalidateQueries({ queryKey: ['prizeContract', prizeAddress] });
        }
    }, [blockNumber, queryClient, prizeAddress]);

    return {
        assignCriteriaWeights,
        fundPrize,
        moveToNextState,
        addEvaluators,
        submitContribution,
        assignScores,
        allocateRewards,
        claimReward,
        getPrizeState: prizeState,
        getOrganizer: organizer,
        getName: name ?? '',
        description,
        monetaryRewardPool,
        getContribution,
        criteriaNames,
        criteriaWeights: criteriaWeights ?? [],
        createdAt: createdAt,
        strategy: strategy,
        userRoles: userRoles ?? [],
        isLoadingUserRoles,
        hasRole,
        canSubmit: () => canPerformRole('CONTESTANT_ROLE'),
        canManagePrize: () => canPerformRole('DEFAULT_ADMIN_ROLE'),
        canEvaluate: () => canPerformRole('EVALUATOR_ROLE'),
    };
};