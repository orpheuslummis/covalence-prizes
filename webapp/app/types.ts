import { Address, WalletClient } from 'viem';
import {
    UseAccountReturnType,
    UsePublicClientReturnType
} from 'wagmi';

export type Role = 'DEFAULT_ADMIN_ROLE' | 'EVALUATOR_ROLE' | 'CONTESTANT_ROLE';
export type UserRoles = Role[];

export enum State {
    Setup,
    Open,
    Evaluating,
    Rewarding,
    Closed
}

export interface Prize {
    id: string;
    prizeAddress: string;
    name: string;
    description: string;
    pool: bigint;
    status: State;
    allocationStrategy: string;
    criteriaNames: string[];
    createdAt: Date;
    organizer: string;
}

export interface RawPrizeData {
    addr: string;
    name: string;
    description: string;
    pool: bigint;
    status: number;
    allocationStrategy: string;
    criteriaNames: string[];
    createdAt: string;
    organizer: string;
}

export interface PrizeParams {
    name: string;
    desc: string;
    pool: string;
    strategy: string;
    criteria: string[];
}

export interface Contribution {
    contestant: Address;
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
        getPrizeState: (id: string) => Promise<State | null>;
        prizeUpdateTrigger: number;
    };
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    userRoles: Role[];
    setUserRoles: React.Dispatch<React.SetStateAction<Role[]>>;
}