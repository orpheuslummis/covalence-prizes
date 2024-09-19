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
  Closed
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
  monetaryRewardPool: bigint;
  allocationStrategy: AllocationStrategy;
}

export interface Contribution {
  id: bigint;
  contestant: Address;
  description: string;
  evaluationCount: number;
  evaluated: boolean;
  weightedScore: EncryptedUint32;
  reward: EncryptedUint32;
  claimed: boolean;
  evaluationScores: number[]; // Added property
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
}

export type AppContextType = {
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
};

export type UsePrizeDiamondReturn = ReturnType<typeof usePrizeDiamond>;
