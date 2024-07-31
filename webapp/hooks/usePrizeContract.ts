import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Abi, Address } from 'viem';
import { useAccount, useBlockNumber, useReadContract, useWatchContractEvent, useWriteContract } from 'wagmi';
import { State } from '../app/types';
import { config } from '../config';

export const usePrizeContract = (prizeAddress: Address) => {
    const { address: connectedAddress } = useAccount();
    const queryClient = useQueryClient();
    const [isLoadingRoles, setIsLoadingRoles] = useState(true);

    const { data: blockNumber } = useBlockNumber({ watch: true });

    const prizeContractConfig = useMemo(() => ({
        address: prizeAddress,
        abi: config.contracts.PrizeContract.abi as unknown as Abi,
    }), [prizeAddress]);

    const { data: hasAdminRole, isLoading: isLoadingAdminRole } = useReadContract({
        ...prizeContractConfig,
        functionName: 'hasRole',
        args: [config.contracts.PrizeContract.roles['DEFAULT_ADMIN_ROLE'], connectedAddress!],
        query: {
            enabled: !!prizeAddress && !!connectedAddress,
        },
    });

    const { data: hasEvaluatorRole, isLoading: isLoadingEvaluatorRole } = useReadContract({
        ...prizeContractConfig,
        functionName: 'hasRole',
        args: [config.contracts.PrizeContract.roles['EVALUATOR_ROLE'], connectedAddress],
        query: {
            enabled: !!prizeAddress && !!connectedAddress,
        },
    });

    useEffect(() => {
        setIsLoadingRoles(isLoadingAdminRole || isLoadingEvaluatorRole);
    }, [isLoadingAdminRole, isLoadingEvaluatorRole]);

    const roles = useMemo(() => ({
        canSubmit: true,
        canManagePrize: hasAdminRole === true,
        canEvaluate: hasEvaluatorRole === true,
    }), [hasAdminRole, hasEvaluatorRole]);

    console.log('Calculated Roles:', roles);

    const { data: prizeState, error: prizeStateError } = useReadContract<prizeContractAbiType, 'state', any, any, any>({
        ...prizeContractConfig,
        functionName: 'state',
    });

    console.log('Current prize state:', prizeState, 'State enum:', State[prizeState]);

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

    const { data: contribution, refetch: refetchContribution } = useReadContract({
        ...prizeContractConfig,
        functionName: 'contributions',
        args: [connectedAddress],
        query: {
            enabled: !!connectedAddress,
        },
    });

    const { writeContract, writeContractAsync } = useWriteContract({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['prizeContract', prizeAddress] });
            },
        },
    });

    const checkState = useCallback((expectedState: State, functionName: string) => {
        if (prizeState !== expectedState) {
            throw new Error(`Cannot ${functionName}: Prize is not in ${State[expectedState]} state`);
        }
    }, [prizeState]);

    const checkAdminRole = useCallback(() => {
        if (!roles.canManagePrize) {
            throw new Error('You do not have permission to perform this action');
        }
    }, [roles]);

    const checkEvaluatorRole = useCallback(() => {
        if (!roles.canEvaluate) {
            throw new Error('You do not have permission to evaluate submissions');
        }
    }, [roles]);

    const assignCriteriaWeights = useCallback(
        async (weights: number[]) => {
            checkAdminRole();
            checkState(State.Setup, 'assign criteria weights');
            if (weights.length !== criteriaNames.length) {
                throw new Error('Mismatch in number of weights');
            }
            return writeContract({ ...prizeContractConfig, functionName: 'assignCriteriaWeights', args: [weights] });
        },
        [writeContract, prizeContractConfig, checkAdminRole, checkState, criteriaNames]
    );

    const fundPrize = useCallback(
        async (amount: bigint) => {
            checkAdminRole();
            checkState(State.Setup, 'fund prize');
            if (amount !== monetaryRewardPool) {
                throw new Error('Must send exact prize amount');
            }
            return writeContract({ ...prizeContractConfig, functionName: 'fundPrize', args: [], value: amount });
        },
        [writeContract, prizeContractConfig, checkAdminRole, checkState, monetaryRewardPool]
    );

    const addEvaluators = useCallback(
        async (evaluators: Address[]) => {
            checkAdminRole();
            const tx = await writeContractAsync({
                ...prizeContractConfig,
                functionName: 'addEvaluators',
                args: [evaluators]
            });
            return tx; // This will return the transaction hash
        },
        [writeContractAsync, prizeContractConfig, checkAdminRole]
    );

    const submitContribution = useCallback(
        async (description: string) => {
            console.log('Attempting to submit contribution. Current state:', prizeState, 'Expected state:', State.Open);
            checkState(State.Open, 'submit contribution');

            console.log('Current contribution data:', contribution);

            // Check if a contribution already exists
            if (contribution && contribution[0] !== '0x0000000000000000000000000000000000000000') {
                console.log('Existing contribution detected:', contribution);
                throw new Error('You have already submitted a contribution');
            }

            console.log('Submitting new contribution...');
            const result = await writeContractAsync({
                ...prizeContractConfig,
                functionName: 'submitContribution',
                args: [description],
            });
            console.log('Submission result:', result);
            return result;
        },
        [writeContractAsync, prizeContractConfig, checkState, prizeState, contribution]
    );

    const assignScores = useCallback(
        async (contestants: Address[], encryptedScores: bigint[][]) => {
            checkEvaluatorRole();
            checkState(State.Evaluating, 'assign scores');
            if (contestants.length !== encryptedScores.length) {
                throw new Error('Mismatch in input arrays');
            }
            if (contestants.length > 100) { // MAX_BATCH_SIZE from contract
                throw new Error('Batch size exceeds maximum');
            }
            // Additional checks could be added here if needed
            return writeContract({ ...prizeContractConfig, functionName: 'assignScores', args: [contestants, encryptedScores] });
        },
        [writeContract, prizeContractConfig, checkEvaluatorRole, checkState]
    );

    const allocateRewards = useCallback(
        async () => {
            checkAdminRole();
            checkState(State.Rewarding, 'allocate rewards');
            return writeContract({ ...prizeContractConfig, functionName: 'allocateRewards', args: [] });
        },
        [writeContract, prizeContractConfig, checkAdminRole, checkState]
    );

    const claimReward = useCallback(
        async () => {
            checkState(State.Closed, 'claim reward');
            if (!contribution || contribution[0] === '0x0000000000000000000000000000000000000000') {
                throw new Error('No contribution submitted');
            }
            if (contribution[5]) {
                throw new Error('Reward already claimed');
            }
            if (contribution[3] <= 0n) {
                throw new Error('No reward to claim');
            }
            return writeContract({ ...prizeContractConfig, functionName: 'claimReward', args: [] });
        },
        [writeContract, prizeContractConfig, checkState, contribution]
    );

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

    useEffect(() => {
        if (blockNumber) {
            queryClient.invalidateQueries({ queryKey: ['prizeContract', prizeAddress] });
        }
    }, [blockNumber, queryClient, prizeAddress]);

    const isAdmin = useMemo(() => roles.canManagePrize, [roles]);

    const moveToNextState = useCallback(
        async () => {
            if (!isAdmin) {
                throw new Error('Only admin can move to the next state');
            }
            console.log('Moving to next state. Current state:', prizeState);
            return writeContractAsync({
                ...prizeContractConfig,
                functionName: 'moveToNextState',
            });
        },
        [writeContractAsync, prizeContractConfig, isAdmin, prizeState]
    );
    return useMemo(() => ({
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
        contribution,
        refetchContribution,
        criteriaNames,
        criteriaWeights: criteriaWeights ?? [],
        createdAt,
        strategy,
        roles,
        isLoadingRoles,
        isAdmin,
        currentState: prizeState,
    }), [
        assignCriteriaWeights,
        fundPrize,
        moveToNextState,
        addEvaluators,
        submitContribution,
        assignScores,
        allocateRewards,
        claimReward,
        prizeState,
        organizer,
        name,
        description,
        monetaryRewardPool,
        contribution,
        refetchContribution,
        criteriaNames,
        criteriaWeights,
        createdAt,
        strategy,
        roles,
        isLoadingRoles,
        isAdmin
    ]);
};