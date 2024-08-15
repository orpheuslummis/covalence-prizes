import { UseMutateAsyncFunction, UseMutateFunction } from '@tanstack/react-query';
import { Address, WalletClient } from 'viem';
import {
    UseAccountReturnType,
    UsePublicClientReturnType
} from 'wagmi';

export type Role = 'ADMIN_ROLE' | 'EVALUATOR_ROLE' | 'CONTESTANT_ROLE';
export type UserRoles = Role[];

export enum State {
    Setup,
    Open,
    Evaluating,
    Allocating,
    Claiming,
    Closed
}

export enum AllocationStrategy {
    Linear = 0,
    Quadratic = 1,
    Invalid = 2
}

export interface Prize {
    id: string;
    organizer: Address;
    name: string;
    description: string;
    createdAt: bigint;
    monetaryRewardPool: bigint;
    fundedAmount: bigint;
    criteriaNames: string[];
    criteriaWeights: number[];
    allocationStrategy: AllocationStrategy;
    state: State;
    rewardsAllocated: boolean;
    evaluatedContributionsCount: number;
    claimedRewardsCount: number;
    contributionCount: number;
    totalScore: bigint;
    lastProcessedIndex: number;
    address: Address;
}

export interface Contribution {
    id: number;
    contestant: Address;
    description: string;
    evaluationCount: number;
    evaluated: boolean;
    weightedScore: bigint;
    reward: bigint;
    claimed: boolean;
}

export interface PrizeParams {
    name: string;
    description: string;
    monetaryRewardPool: bigint;
    criteria: string[];
    criteriaWeights: number[];
    allocationStrategy: AllocationStrategy;
}

export interface AppContextType {
    account: UseAccountReturnType;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    publicClient: UsePublicClientReturnType;
    walletClient: WalletClient | undefined;
    contracts: {
        Diamond: {
            address: Address;
            abi: any;
        };
        DiamondCutFacet: {
            address: Address;
            abi: any;
        };
        DiamondLoupeFacet: {
            address: Address;
            abi: any;
        };
        PrizeACLFacet: {
            address: Address;
            abi: any;
        };
        PrizeManagerFacet: {
            address: Address;
            abi: any;
        };
        PrizeContributionFacet: {
            address: Address;
            abi: any;
        };
        PrizeRewardFacet: {
            address: Address;
            abi: any;
        };
        PrizeEvaluationFacet: {
            address: Address;
            abi: any;
        };
        PrizeStrategyFacet: {
            address: Address;
            abi: any;
        };
        PrizeFundingFacet: {
            address: Address;
            abi: any;
        };
        PrizeStateFacet: {
            address: Address;
            abi: any;
        };
    };
    prizeDiamond: {
        prizeCount: number;
        createPrize: UseMutateFunction<`0x${string}`, Error, PrizeParams, unknown>;
        createPrizeAsync: UseMutateAsyncFunction<`0x${string}`, Error, PrizeParams, unknown>;
        getPrizeDetails: (prizeId: bigint) => Promise<Prize>;
        getPrizes: (startIndex: bigint, count: bigint) => Promise<Prize[]>;
        getState: (prizeId: bigint) => Promise<State>;
        moveToNextState: (prizeId: bigint) => Promise<void>;
        updateClaimStatus: (prizeId: bigint) => Promise<void>;
        addPrizeEvaluator: (prizeId: bigint, evaluator: Address) => Promise<void>;
        addEvaluators: (prizeId: bigint, evaluators: Address[]) => Promise<void>;
        removePrizeEvaluator: (prizeId: bigint, evaluator: Address) => Promise<void>;
        removeEvaluators: (prizeId: bigint, evaluators: Address[]) => Promise<void>;
        isEvaluator: (prizeId: bigint, evaluator: Address) => Promise<boolean>;
        isPrizeOrganizer: (prizeId: bigint, account: Address) => Promise<boolean>;
        isPrizeEvaluator: (prizeId: bigint, account: Address) => Promise<boolean>;
        getPrizeEvaluatorCount: (prizeId: bigint) => Promise<number>;
        getAllocationStrategy: (prizeId: bigint) => Promise<AllocationStrategy>;
        setAllocationStrategy: (prizeId: bigint, strategy: AllocationStrategy) => Promise<void>;
        getAllAllocationStrategies: () => Promise<AllocationStrategy[]>;
        submitContribution: (prizeId: bigint, description: string) => Promise<number>;
        getContributionCount: (prizeId: bigint) => Promise<number>;
        getContribution: (prizeId: bigint, contributionId: bigint) => Promise<Contribution>;
        getContributionByIndex: (prizeId: bigint, index: bigint) => Promise<[Address, bigint]>;
        getContributionIdsForContestant: (prizeId: bigint, contestant: Address) => Promise<bigint[]>;
        assignScoresForContestant: (prizeId: bigint, contestant: Address, scores: number[]) => Promise<void>;
        getEvaluationCount: (prizeId: bigint, contestant: Address) => Promise<number>;
        hasEvaluatorScoredContestant: (prizeId: bigint, evaluator: Address, contestant: Address) => Promise<boolean>;
        assignCriteriaWeights: (prizeId: bigint, weights: number[]) => Promise<void>;
        getCriteriaWeights: (prizeId: bigint) => Promise<number[]>;
        allocateRewardsBatch: (prizeId: bigint, batchSize: bigint) => Promise<void>;
        computeContestantClaimReward: (prizeId: bigint) => Promise<void>;
        viewContestantClaimReward: (prizeId: bigint) => Promise<bigint>;
        areAllRewardsClaimed: (prizeId: bigint) => Promise<boolean>;
        fundTotally: (prizeId: bigint, amount: bigint) => Promise<void>;
        getPrizeEvaluators: (prizeId: bigint) => Promise<Address[]>;
        getContributions: (prizeId: bigint, startIndex: bigint, count: bigint) => Promise<Contribution[]>;
    };
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    userRoles: Role[];
    setUserRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    prizes: Prize[];
    blockNumber: number | undefined;
    refetchPrizes: () => Promise<unknown>;
}