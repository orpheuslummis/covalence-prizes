import { WalletClient } from 'viem';
import {
    UseAccountReturnType,
    UsePublicClientReturnType
} from 'wagmi';

export type Role = 'organizer' | 'evaluator' | 'contestant';
export type UserRoles = Set<Role>;

export enum PrizeStatus {
    Setup = 0,
    Open = 1,
    Evaluating = 2,
    Rewarding = 3,
    Closed = 4
}

export interface Prize {
    id: string;
    prizeAddress: string;
    name: string;
    description: string;
    pool: bigint;
    status: PrizeStatus;
    allocationStrategy: string;
    criteriaNames: string[];
    createdAt: Date;
    organizer: string;
}

export interface RawPrizeData {
    addr: string;
    name: string;
    description: string;
    pool: string; // This will be a string representation of a bigint
    status: number; // This will be a number representing the PrizeStatus enum
    allocationStrategy: string;
    criteriaNames: string[];
    createdAt: string; // This will be a string representation of a timestamp
    organizer: string;
}

export interface PrizeParams {
    name: string;
    desc: string;
    pool: bigint;
    strategy: string;
    criteria: string[];
}

export interface Contribution {
    contestant: string;
    description: string;
    aggregatedScore: bigint;
    evaluationCount: number;
    reward: bigint;
    claimed: boolean;
}

export interface AppContextType {
    account: UseAccountReturnType;
    connect: any;
    disconnect: any;
    publicClient: UsePublicClientReturnType;
    walletClient: WalletClient | undefined;
    contracts: {
        PrizeManager: {
            address: `0x${string}`;
            abi: any;
        };
        PrizeContract: {
            abi: any;
        };
        AllocationStrategyLinear: {
            address: `0x${string}`;
        };
    };
    prizeManager: {
        prizes: Prize[];
        createPrize: (params: PrizeParams) => Promise<string | null>;
        getPrizes: (page?: number, pageSize?: number, forceRefresh?: boolean) => Promise<{ prizes: Prize[], totalCount: number }>;
        getPrize: (id: string) => Promise<Prize | null>;
        deactivatePrize: (id: string) => Promise<boolean>;
        refreshPrize: (id: string) => Promise<Prize | null>;
        getPrizeState: (id: string) => Promise<PrizeStatus | null>;
        prizeUpdateTrigger: number;
        getUserRoles: (address: string, prizeAddress: string) => Promise<string[]>;
        addEvaluators: (prizeAddress: string, evaluators: string[]) => Promise<boolean>;
    };
    usePrizeContract: (prizeAddress: string) => {
        assignCriteriaWeights: (weights: number[]) => Promise<void>;
        fundPrize: () => Promise<void>;
        moveToNextState: () => Promise<void>;
        addEvaluators: (evaluators: string[]) => Promise<void>;
        submitContribution: (description: string) => Promise<void>;
        assignScores: (contestants: string[], encryptedScores: number[][]) => Promise<void>;
        allocateRewards: () => Promise<void>;
        claimReward: () => Promise<void>;
        getPrizeState: PrizeStatus | undefined;
        getOrganizer: string | undefined;
        getName: string | undefined;
        getDescription: string | undefined;
        getMonetaryRewardPool: bigint | undefined;
        getContribution: (contestant: string) => Promise<Contribution | undefined>;
        getCriteriaNames: string[] | undefined;
        getCriteriaWeights: number[] | undefined;
    };
    userRoles: UserRoles;
    setUserRoles: (roles: UserRoles) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}