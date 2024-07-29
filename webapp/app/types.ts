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

export interface PrizeParams {
    name: string;
    desc: string;
    pool: bigint;
    strategy: string;
    criteria: string[];
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
        fundPrize: (id: string, amount: bigint) => Promise<boolean>;
        assignCriteriaWeights: (id: string, weights: number[]) => Promise<boolean>;
        moveToNextState: (id: string) => Promise<boolean>;
        getPrizeState: (id: string) => Promise<PrizeStatus | null>;
        prizeUpdateTrigger: number;
        getUserRoles: (address: string, prizeAddress: string) => Promise<string[]>;
        addEvaluators: (prizeAddress: string, evaluators: string[]) => Promise<boolean>;
    };
    userRoles: UserRoles;
    setUserRoles: (roles: UserRoles) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}