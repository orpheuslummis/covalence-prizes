import { UseMutateAsyncFunction, UseMutateFunction } from "@tanstack/react-query";
import { Address, Hash } from "viem";
import { EncryptedUint32 } from "fhenixjs";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";

export type Role = "ADMIN_ROLE" | "EVALUATOR_ROLE" | "CONTESTANT_ROLE";
export type UserRoles = Role[];

export enum State {
  Setup,
  Funded,
  WeightsAssigned,
  EvaluatorsAssigned,
  Evaluating,
  Allocating,
  Claiming,
  Closed,
  Open,
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
  id: bigint;
  contestant: Address;
  description: string;
  // Add other relevant fields as needed
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
  prizeDiamond: {
    prizeCount: () => Promise<bigint>;
    getPrizeCount: () => Promise<bigint>;
    createPrize: UseMutateFunction<void, Error, PrizeParams, unknown>;
    createPrizeAsync: UseMutateAsyncFunction<void, Error, PrizeParams, unknown>;
    getPrizeDetails: (prizeId: bigint) => Promise<PrizeDetails>;
    getPrizes: (startIndex: bigint, count: bigint) => Promise<PrizeDetails[]>;
    getState: (prizeId: bigint) => Promise<State>;
    moveToNextState: UseMutateFunction<void, Error, { prizeId: bigint }, unknown>;
    moveToNextStateAsync: UseMutateAsyncFunction<void, Error, { prizeId: bigint }, unknown>;
    updateClaimStatus: UseMutateFunction<
      void,
      Error,
      { prizeId: bigint; contestant: Address; claimStatus: boolean },
      unknown
    >;
    updateClaimStatusAsync: UseMutateAsyncFunction<
      void,
      Error,
      { prizeId: bigint; contestant: Address; claimStatus: boolean },
      unknown
    >;
    addPrizeEvaluator: UseMutateFunction<void, Error, { prizeId: bigint; evaluator: Address }, unknown>;
    addPrizeEvaluatorAsync: UseMutateAsyncFunction<void, Error, { prizeId: bigint; evaluator: Address }, unknown>;
    addEvaluators: UseMutateFunction<void, Error, { prizeId: bigint; evaluators: Address[] }, unknown>;
    addEvaluatorsAsync: UseMutateAsyncFunction<void, Error, { prizeId: bigint; evaluators: Address[] }, unknown>;
    removePrizeEvaluator: UseMutateFunction<void, Error, { prizeId: bigint; evaluator: Address }, unknown>;
    removePrizeEvaluatorAsync: UseMutateAsyncFunction<void, Error, { prizeId: bigint; evaluator: Address }, unknown>;
    removeEvaluators: UseMutateFunction<void, Error, { prizeId: bigint; evaluators: Address[] }, unknown>;
    removeEvaluatorsAsync: UseMutateAsyncFunction<void, Error, { prizeId: bigint; evaluators: Address[] }, unknown>;
    isEvaluator: (prizeId: bigint, address: Address) => Promise<boolean>;
    isPrizeEvaluator: (prizeId: bigint, address: Address) => Promise<boolean>;
    getPrizeEvaluatorCount: (prizeId: bigint) => Promise<number>;
    getContributionCount: (prizeId: bigint) => Promise<number>;
    getContribution: (prizeId: bigint, contributionId: bigint) => Promise<Contribution>;
    getContributionByIndex: (prizeId: bigint, index: bigint) => Promise<[Address, bigint]>;
    getContributionIdsForContestant: (prizeId: bigint, contestant: Address) => Promise<bigint[]>;
    assignScoresForContestant: (prizeId: bigint, contestant: Address, scores: number[]) => Promise<void>;
    getEvaluationCount: (prizeId: bigint, contestant: Address) => Promise<number>;
    hasEvaluatorScoredContribution: (prizeId: bigint, evaluator: Address, contestant: Address) => Promise<boolean>;
    getCriteriaWeights: (prizeId: bigint) => Promise<number[]>;
    areAllRewardsClaimed: (prizeId: bigint) => Promise<boolean>;
    getAllAllocationStrategies: () => Promise<AllocationStrategy[]>;
    getAllocationStrategy: (prizeId: bigint) => Promise<AllocationStrategy>;
    setAllocationStrategy: UseMutateFunction<void, Error, { prizeId: bigint; strategy: AllocationStrategy }, unknown>;
    setAllocationStrategyAsync: UseMutateAsyncFunction<
      void,
      Error,
      { prizeId: bigint; strategy: AllocationStrategy },
      unknown
    >;
    assignCriteriaWeights: UseMutateFunction<void, Error, { prizeId: bigint; weights: number[] }, unknown>;
    assignCriteriaWeightsAsync: UseMutateAsyncFunction<void, Error, { prizeId: bigint; weights: number[] }, unknown>;
    getPrizeEvaluators: (prizeId: bigint) => Promise<Address[]>;
    viewContestantClaimReward: (prizeId: bigint, permission: any) => Promise<bigint>;
    encryptScores: (scores: number[]) => Promise<EncryptedUint32[]>;
    decryptReward: (encryptedReward: EncryptedUint32) => Promise<number>;
    waitForTransaction: (hash: Hash) => Promise<void>;
    getContestants: (prizeId: bigint) => Promise<Address[]>;
    submitContribution: UseMutateFunction<void, Error, { prizeId: bigint; description: string }, unknown>;
    submitContributionAsync: UseMutateAsyncFunction<void, Error, { prizeId: bigint; description: string }, unknown>;
    getContributions: (prizeId: bigint, startIndex: bigint, count: bigint) => Promise<Contribution[]>;
    evaluateContribution: UseMutateFunction<
      void,
      Error,
      { prizeId: bigint; contributionId: bigint; encryptedScores: EncryptedUint32[] },
      unknown
    >;
    evaluateContributionAsync: UseMutateAsyncFunction<
      void,
      Error,
      { prizeId: bigint; contributionId: bigint; encryptedScores: EncryptedUint32[] },
      unknown
    >;
    useIsPrizeEvaluator: (prizeId: bigint, address: Address) => boolean;
  };
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
