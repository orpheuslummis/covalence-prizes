import { Contribution, PrizeStatus } from '@/types';
import { Address } from 'viem';
import { config } from '../config';
import { useContractInteraction } from './useContractInteraction';

export const usePrizeContract = (prizeAddress: Address) => {
    const { readContract, writeContract, createQuery, createMutation } = useContractInteraction();

    const prizeContractConfig = {
        address: prizeAddress,
        abi: config.contracts.PrizeContract.abi,
    };

    const getPrizeStateQuery = createQuery<PrizeStatus, Error>(
        ['prizeState', prizeAddress],
        async () => readContract<PrizeStatus>(prizeContractConfig, 'state', [])
    );

    const getOrganizerQuery = createQuery<Address, Error>(
        ['prizeOrganizer', prizeAddress],
        async () => readContract<Address>(prizeContractConfig, 'organizer', [])
    );

    const getNameQuery = createQuery<string, Error>(
        ['prizeName', prizeAddress],
        async () => readContract<string>(prizeContractConfig, 'name', [])
    );

    const getDescriptionQuery = createQuery<string, Error>(
        ['prizeDescription', prizeAddress],
        async () => readContract<string>(prizeContractConfig, 'description', [])
    );

    const getMonetaryRewardPoolQuery = createQuery<bigint, Error>(
        ['prizeRewardPool', prizeAddress],
        async () => readContract<bigint>(prizeContractConfig, 'monetaryRewardPool', [])
    );

    const getContributionQuery = (contestant: Address) => createQuery<Contribution, Error>(
        ['contribution', prizeAddress, contestant],
        async () => readContract<Contribution>(prizeContractConfig, 'contributions', [contestant])
    );

    const getCriteriaNamesQuery = createQuery<string[], Error>(
        ['criteriaNames', prizeAddress],
        async () => readContract<string[]>(prizeContractConfig, 'getCriteriaNames', [])
    );

    const getCriteriaWeightsQuery = createQuery<number[], Error>(
        ['criteriaWeights', prizeAddress],
        async () => readContract<number[]>(prizeContractConfig, 'getCriteriaWeights', [])
    );

    const assignCriteriaWeightsMutation = createMutation<{ weights: number[] }, void>(
        async ({ weights }) => {
            await writeContract(prizeContractConfig, 'assignCriteriaWeights', [weights]);
        },
        "Failed to assign criteria weights",
        ['prize', prizeAddress]
    );

    const fundPrizeMutation = createMutation<void, void>(
        async () => {
            await writeContract(prizeContractConfig, 'fundPrize', []);
        },
        "Failed to fund prize",
        ['prize', prizeAddress]
    );

    const moveToNextStateMutation = createMutation<void, void>(
        async () => {
            await writeContract(prizeContractConfig, 'moveToNextState', []);
        },
        "Failed to move prize to next state",
        ['prize', prizeAddress]
    );

    const addEvaluatorsMutation = createMutation<{ evaluators: string[] }, void>(
        async ({ evaluators }) => {
            await writeContract(prizeContractConfig, 'addEvaluators', [evaluators]);
        },
        "Failed to add evaluators",
        ['prize', prizeAddress]
    );

    const submitContributionMutation = createMutation<{ description: string }, void>(
        async ({ description }) => {
            await writeContract(prizeContractConfig, 'submitContribution', [description]);
        },
        "Failed to submit contribution",
        ['prize', prizeAddress]
    );

    const assignScoresMutation = createMutation<{ contestants: string[], encryptedScores: number[][] }, void>(
        async ({ contestants, encryptedScores }) => {
            await writeContract(prizeContractConfig, 'assignScores', [contestants, encryptedScores]);
        },
        "Failed to assign scores",
        ['prize', prizeAddress]
    );

    const allocateRewardsMutation = createMutation<void, void>(
        async () => {
            await writeContract(prizeContractConfig, 'allocateRewards', []);
        },
        "Failed to allocate rewards",
        ['prize', prizeAddress]
    );

    const claimRewardMutation = createMutation<void, void>(
        async () => {
            await writeContract(prizeContractConfig, 'claimReward', []);
        },
        "Failed to claim reward",
        ['prize', prizeAddress]
    );

    const hasRole = async (role: Role) => {
        if (!address) return false;
        return readContract<boolean>(prizeContractConfig, 'hasRole', [role, address]);
    };

    const canSubmit = () => hasRole('CONTESTANT_ROLE');
    const canManagePrize = () => hasRole('DEFAULT_ADMIN_ROLE');
    const canEvaluate = () => hasRole('EVALUATOR_ROLE');

    return {
        assignCriteriaWeights: assignCriteriaWeightsMutation.mutate,
        fundPrize: fundPrizeMutation.mutate,
        moveToNextState: moveToNextStateMutation.mutate,
        addEvaluators: addEvaluatorsMutation.mutate,
        submitContribution: submitContributionMutation.mutate,
        assignScores: assignScoresMutation.mutate,
        allocateRewards: allocateRewardsMutation.mutate,
        claimReward: claimRewardMutation.mutate,
        getPrizeState: getPrizeStateQuery.data,
        getOrganizer: getOrganizerQuery.data,
        getName: getNameQuery.data,
        getDescription: getDescriptionQuery.data,
        getMonetaryRewardPool: getMonetaryRewardPoolQuery.data,
        getContribution: getContributionQuery,
        getCriteriaNames: getCriteriaNamesQuery.data,
        getCriteriaWeights: getCriteriaWeightsQuery.data,
        hasRole,
        canSubmit,
        canManagePrize,
        canEvaluate,
    };
};