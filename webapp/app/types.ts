import { useWeb3 } from './hooks/useWeb3';

export type Role = 'organizer' | 'evaluator' | 'contestant' | null;

export enum PrizeStatus {
    Setup = 'Setup',
    Open = 'Open',
    Evaluating = 'Evaluating',
    Rewarding = 'Rewarding',
    Closed = 'Closed',
    Cancelled = 'Cancelled'
}

export interface Prize {
    id: number;
    prizeAddress: string;
    name: string;
    description: string;
    totalRewardPool: string;
    active: boolean;
    state: PrizeStatus | null;
    claimed?: boolean;
}

export interface Contribution {
    id: number;
    description: string;
    contestant: string;
}

export interface AppContextType {
    web3: ReturnType<typeof useWeb3>;
    role: Role;
    setRole: (role: Role) => void;
    disconnect: () => Promise<void>;
    updateConnectionState: (isConnected: boolean) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    contracts: {
        PrizeManager: {
            address: string;
            abi: any;
        };
        StrategyRegistry: {
            address: string;
        };
        AllocationStrategyLinear: {
            address: string;
        };
    };
}