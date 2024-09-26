import { Address } from "viem";
import { EncryptedUint32 } from "fhenixjs";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { config } from "../config";

export type Role = "ADMIN_ROLE" | "EVALUATOR_ROLE" | "CONTESTANT_ROLE";
export type UserRoles = Role[];

export enum State {
  Setup,
  Open,
  Evaluating,
  Allocating,
  Claiming,
  Closed,
}

export enum AllocationStrategy {
  Linear,
  Quadratic,
  Invalid,
}

export interface PrizeParams {
  name: string;
  description: string;
  pool: bigint;
  criteria: string[];
  criteriaWeights: number[];
  strategy: AllocationStrategy;
}

export interface Contribution {
  id?: bigint;
  contestant: string;
  evaluationCount: bigint;
  description: string;
  // Add any other properties that are part of the contribution
}

export interface PrizeDetails {
  id: bigint;
  organizer: Address;
  name: string;
  description: string;
  monetaryRewardPool: bigint;
  fundedAmount: bigint;
  state: State;
  criteriaNames: string[];
  criteriaWeights: number[];
  createdAt: bigint;
  strategy: AllocationStrategy;
  contributionCount: bigint;
  evaluatedContributionsCount: number;
  claimedRewardsCount: number;
  rewardsAllocated: boolean;
  lastProcessedIndex: bigint;
}

export interface AppContextType {
  contracts: typeof config.contracts;
  prizeDiamond: ReturnType<typeof usePrizeDiamond>;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  userRoles: Role[];
  setUserRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  prizes: PrizeDetails[];
  blockNumber: number | undefined;
  refetchPrizes: () => Promise<unknown>;
  isPrizesLoading: boolean;
  allocateRewardsBatch: (params: { prizeId: bigint; batchSize: bigint }) => Promise<void>;
  getAllocationDetails: (prizeId: bigint) => Promise<{ lastProcessedIndex: bigint; contributionCount: bigint; rewardsAllocated: boolean }>;
  hasClaimableReward: (prizeId: bigint, address: Address) => Promise<boolean>;
  claimReward: (prizeId: bigint) => Promise<void>;
}

export type UsePrizeDiamondReturn = ReturnType<typeof usePrizeDiamond>;
