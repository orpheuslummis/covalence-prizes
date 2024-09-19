import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EncryptedUint32, Permission } from "fhenixjs";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { Address, Hash } from "viem";
import { useBlockNumber, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { config } from "../config";
import { AllocationStrategy, PrizeDetails, PrizeParams, State } from "../lib/types";
import { useFhenixClient } from "./useFhenixClient";

type AbiFunction = {
  type: "function";
  name: string;
  inputs: any[];
  outputs: any[];
  stateMutability: string;
};

const diamondAbi = config.contracts.Diamond.abi as AbiFunction[];

type DiamondFunctionName = Extract<(typeof diamondAbi)[number], { type: "function" }>["name"];

const convertToAllocationStrategy = (strategy: number): AllocationStrategy => {
  switch (strategy) {
    case 0:
      return AllocationStrategy.Linear;
    case 1:
      return AllocationStrategy.Quadratic;
    case 2:
      return AllocationStrategy.Invalid;
    default:
      throw new Error("Invalid allocation strategy");
  }
};

export const usePrizeDiamond = () => {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { getFheClient } = useFhenixClient(config.contracts.Diamond.address);
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const diamondAddress = config.contracts.Diamond.address;

  const readDiamond = useCallback(
    async <T extends DiamondFunctionName>(functionName: T, args: any[]): Promise<any> => {
      try {
        if (!publicClient) {
          throw new Error("Public client is not available");
        }
        const data = await publicClient.readContract({
          address: diamondAddress,
          abi: diamondAbi,
          functionName,
          args,
        });
        return data;
      } catch (error) {
        console.error(`Error reading from Diamond.${functionName}:`, error);
        throw error;
      }
    },
    [publicClient, diamondAddress, diamondAbi],
  );

  const useReadDiamond = useCallback(
    <T extends DiamondFunctionName>(functionName: T) =>
      useCallback((...args: any[]) => readDiamond(functionName, args), [readDiamond, functionName]),
    [readDiamond],
  );

  const getState = useReadDiamond("getState");
  const isEvaluator = useReadDiamond("isEvaluator");
  const getPrizeEvaluatorCount = useReadDiamond("getPrizeEvaluatorCount");
  const getContributionCount = useReadDiamond("getContributionCount");
  const getContribution = useReadDiamond("getContribution");
  const getContributionByIndex = useReadDiamond("getContributionByIndex");
  const getContributionIdsForContestant = useReadDiamond("getContributionIdsForContestant");
  const getEvaluationCount = useReadDiamond("getEvaluationCount");
  const hasEvaluatorScoredContribution = useReadDiamond("hasEvaluatorScoredContribution");
  const getCriteriaWeights = useReadDiamond("getCriteriaWeights");
  const areAllRewardsClaimed = useReadDiamond("areAllRewardsClaimed");
  const getAllAllocationStrategies = useReadDiamond("getAllAllocationStrategies");
  const getAllocationStrategy = useReadDiamond("getAllocationStrategy");
  const getPrizeEvaluators = useReadDiamond("getPrizeEvaluators");

  const getPrizeCount = useCallback(async (): Promise<bigint> => {
    const count: bigint = await readDiamond("getPrizeCount", []);
    return count;
  }, [readDiamond]);

  const getPrizeDetails = useCallback(
    async (prizeId: bigint): Promise<PrizeDetails> => {
      try {
        const details = await readDiamond("getPrizeDetails", [prizeId]);
        return {
          id: BigInt(details.id),
          organizer: details.organizer as Address,
          name: details.name as string,
          description: details.description as string,
          monetaryRewardPool: BigInt(details.monetaryRewardPool),
          fundedAmount: BigInt(details.fundedAmount),
          state: details.state as State,
          criteriaNames: details.criteriaNames as string[],
          criteriaWeights: details.criteriaWeights as number[],
          createdAt: BigInt(details.createdAt),
          strategy: convertToAllocationStrategy(details.strategy),
          contributionCount: BigInt(details.contributionCount),
          evaluatedContributionsCount: Number(details.evaluatedContributionsCount),
          claimedRewardsCount: Number(details.claimedRewardsCount),
          rewardsAllocated: details.rewardsAllocated as boolean,
        };
      } catch (error) {
        console.error(`Error fetching details for prize ${prizeId}:`, error);
        throw error;
      }
    },
    [readDiamond],
  );

  const usePrizeDetails = (prizeId: bigint) => {
    return useQuery<PrizeDetails, Error>({
      queryKey: ["prizeDetails", prizeId.toString()],
      queryFn: () => getPrizeDetails(prizeId),
      staleTime: 60000,
      enabled: !!prizeId,
    });
  };

  const getPrizes = useCallback(
    async (startIndex: bigint, count: bigint): Promise<PrizeDetails[]> => {
      try {
        const rawPrizes = await readDiamond("getPrizes", [startIndex, count]);
        if (!Array.isArray(rawPrizes)) {
          throw new Error("Expected getPrizes to return an array");
        }

        const detailedPrizes = await Promise.all(
          rawPrizes.map(async (prize: any): Promise<PrizeDetails> => {
            const prizeId = BigInt(prize.id);
            try {
              return await getPrizeDetails(prizeId);
            } catch (error) {
              console.error(`Error fetching details for prize ${prizeId}:`, error);
              throw error;
            }
          }),
        );

        return detailedPrizes;
      } catch (error) {
        console.error("Error fetching prizes:", error);
        throw error;
      }
    },
    [readDiamond, getPrizeDetails],
  );

  const getContestants = useCallback(
    async (prizeId: bigint): Promise<Address[]> => {
      try {
        const contributionCount: bigint = await getContributionCount(prizeId);
        const contestantsSet = new Set<Address>();

        for (let i = 0n; i < contributionCount; i++) {
          const [contestant] = await getContributionByIndex(prizeId, i);
          if (contestant) {
            contestantsSet.add(contestant as Address);
          }
        }

        return Array.from(contestantsSet);
      } catch (error) {
        console.error(`Error fetching contestants for prize ${prizeId}:`, error);
        throw error;
      }
    },
    [getContributionCount, getContributionByIndex],
  );

  // Mutations

  const fundTotally = useMutation<string, Error, { prizeId: bigint; amount: bigint }>({
    mutationFn: async ({ prizeId, amount }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "fundTotally",
        args: [prizeId],
        value: amount,
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Prize funded successfully");
    },
    onError: (error) => {
      console.error("Error funding prize:", error);
      toast.error(`Failed to fund prize: ${error.message}`);
    },
  });

  const setAllocationStrategy = useMutation<string, Error, { prizeId: bigint; strategy: AllocationStrategy }>({
    mutationFn: async ({ prizeId, strategy }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "setAllocationStrategy",
        args: [prizeId, strategy],
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Allocation strategy updated successfully");
    },
    onError: (error) => {
      console.error("Error setting allocation strategy:", error);
      toast.error(`Failed to set allocation strategy: ${error.message}`);
    },
  });

  const assignCriteriaWeights = useMutation<string, Error, { prizeId: bigint; weights: number[] }>({
    mutationFn: async ({ prizeId, weights }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "assignCriteriaWeights",
        args: [prizeId, weights],
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Criteria weights assigned successfully");
    },
    onError: (error) => {
      console.error("Error assigning criteria weights:", error);
      toast.error(`Failed to assign criteria weights: ${error.message}`);
    },
  });

  const createPrize = useMutation<string, Error, PrizeParams>({
    mutationFn: async (prizeParams) => {
      if (!walletClient) throw new Error("Wallet not connected");
      const txHash = await writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "createPrize",
        args: [
          prizeParams.name,
          prizeParams.description,
          prizeParams.monetaryRewardPool,
          prizeParams.criteriaWeights,
          prizeParams.allocationStrategy,
        ],
      });
      return txHash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizes"] });
      toast.success('Prize created successfully');
    },
    onError: (error) => {
      console.error('Error creating prize:', error);
      toast.error(`Failed to create prize: ${error.message}`);
    },
  });

  const submitContribution = useMutation<string, Error, { prizeId: bigint; description: string }>({
    mutationFn: async ({ prizeId, description }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "submitContribution",
        args: [prizeId, description],
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Contribution submitted successfully");
    },
    onError: (error) => {
      console.error("Error submitting contribution:", error);
      toast.error(`Failed to submit contribution: ${error.message}`);
    },
  });

  const evaluateContribution = useMutation<
    void,
    Error,
    { prizeId: bigint; contributionId: bigint; encryptedScores: EncryptedUint32[] }
  >({
    mutationFn: async ({ prizeId, contributionId, encryptedScores }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      await writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "evaluateContribution",
        args: [prizeId, contributionId, encryptedScores],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails"] });
      toast.success('Contribution evaluated successfully');
    },
    onError: (error) => {
      console.error('Error evaluating contribution:', error);
      toast.error(`Failed to evaluate contribution: ${error.message}`);
    },
  });

  // Additional Mutations

  const allocateRewardsBatch = useMutation<string, Error, { prizeId: bigint; batchSize: bigint }>({
    mutationFn: async ({ prizeId, batchSize }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "allocateRewardsBatch",
        args: [prizeId, batchSize],
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Rewards allocated successfully");
    },
    onError: (error) => {
      console.error("Error allocating rewards:", error);
      toast.error(`Failed to allocate rewards: ${error.message}`);
    },
  });

  const computeContestantClaimReward = useMutation<string, Error, { prizeId: bigint }>({
    mutationFn: async ({ prizeId }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "computeContestantClaimReward",
        args: [prizeId],
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Contestant rewards computed successfully");
    },
    onError: (error) => {
      console.error("Error computing contestant rewards:", error);
      toast.error(`Failed to compute contestant rewards: ${error.message}`);
    },
  });

  const viewContestantClaimReward = useCallback(
    async (prizeId: bigint, permission: Permission): Promise<string> => {
      try {
        const reward = await readDiamond("viewContestantClaimReward", [prizeId, permission]);
        return reward;
      } catch (error) {
        console.error("Error viewing contestant claim reward:", error);
        throw error;
      }
    },
    [readDiamond],
  );

  const moveToNextState = useMutation<string, Error, { prizeId: bigint }>({
    mutationFn: async ({ prizeId }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "moveToNextState",
        args: [prizeId],
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Prize state updated successfully");
    },
    onError: (error) => {
      console.error("Error updating prize state:", error);
      toast.error(`Failed to update prize state: ${error.message}`);
    },
  });

  const updateClaimStatus = useMutation<string, Error, { prizeId: bigint }>({
    mutationFn: async ({ prizeId }) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "updateClaimStatus",
        args: [prizeId],
      });
    },
    onSuccess: (_, { prizeId }) => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails", prizeId.toString()] });
      toast.success("Claim status updated successfully");
    },
    onError: (error) => {
      console.error("Error updating claim status:", error);
      toast.error(`Failed to update claim status: ${error.message}`);
    },
  });

  // Utility Functions

  const encryptScores = useCallback(
    async (scores: number[]): Promise<EncryptedUint32[]> => {
      try {
        const fheClient = await getFheClient();
        return await Promise.all(scores.map(async (score) => await fheClient.encrypt_uint32(score)));
      } catch (error) {
        console.error("Error encrypting scores:", error);
        throw error;
      }
    },
    [getFheClient],
  );

  const decryptReward = useCallback(
    async (encryptedReward: EncryptedUint32): Promise<number> => {
      try {
        const fheClient = await getFheClient();
        const decryptedReward: number = await fheClient.unseal(encryptedReward);
        return decryptedReward;
      } catch (error) {
        console.error("Error decrypting reward:", error);
        throw error;
      }
    },
    [getFheClient],
  );

  const waitForTransaction = useCallback(
    async (hash: Hash): Promise<void> => {
      try {
        if (!publicClient) throw new Error("Public client is not available");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (!receipt) throw new Error("Transaction receipt not found");
      } catch (error) {
        console.error("Error waiting for transaction:", error);
        throw error;
      }
    },
    [publicClient],
  );

  const isPrizeEvaluator = useCallback(
    async (prizeId: bigint, address: Address): Promise<boolean> => {
      try {
        const result = await readDiamond("isPrizeEvaluator", [prizeId, address]);
        return result;
      } catch (error) {
        console.error("Error checking if address is prize evaluator:", error);
        throw error;
      }
    },
    [readDiamond],
  );

  // Add the following implementations within the usePrizeDiamond hook

  const canEvaluate = async (prizeId: bigint, address: Address): Promise<boolean> => {
    return await isPrizeEvaluator(prizeId, address);
  };

  const evaluate = useMutation<
    void,
    Error,
    { prizeId: bigint; contributionId: bigint; encryptedScores: EncryptedUint32[] }
  >({
    mutationFn: async ({ prizeId, contributionId, encryptedScores }) => {
      await evaluateContribution.mutateAsync({
        prizeId,
        contributionId,
        encryptedScores,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizeDetails"] });
      toast.success('Contribution evaluated successfully');
    },
    onError: (error) => {
      console.error('Error evaluating contribution:', error);
      toast.error(`Failed to evaluate contribution: ${error.message}`);
    },
  });

  const isPrizeOrganizer = async (prizeId: bigint, address: Address): Promise<boolean> => {
    try {
      const prizeDetails = await getPrizeDetails(prizeId);
      return prizeDetails.organizer.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error("Error checking if address is prize organizer:", error);
      throw error;
    }
  };

  const addEvaluatorsAsync = useCallback(
    async ({ prizeId, evaluators }: { prizeId: bigint; evaluators: Address[] }) => {
      await writeContractAsync({
        address: diamondAddress,
        abi: diamondAbi,
        functionName: "addEvaluators",
        args: [prizeId, evaluators],
      });
    },
    [writeContractAsync, diamondAddress, diamondAbi]
  );

  // Include these in the returned object
  return {
    getState,
    isEvaluator,
    isPrizeEvaluator,
    getPrizeEvaluatorCount,
    getContributionCount,
    getContribution,
    getContributionByIndex,
    getContributionIdsForContestant,
    getEvaluationCount,
    hasEvaluatorScoredContribution,
    getCriteriaWeights,
    areAllRewardsClaimed,
    getAllAllocationStrategies,
    getAllocationStrategy,
    getPrizeEvaluators,

    getPrizeCount,
    getPrizeDetails,
    usePrizeDetails,
    getPrizes,
    getContestants,

    fundTotally: fundTotally.mutate,
    fundTotallyAsync: fundTotally.mutateAsync,

    setAllocationStrategy: setAllocationStrategy.mutate,
    setAllocationStrategyAsync: setAllocationStrategy.mutateAsync,

    assignCriteriaWeights: assignCriteriaWeights.mutate,
    assignCriteriaWeightsAsync: assignCriteriaWeights.mutateAsync,

    createPrize: createPrize.mutate,
    createPrizeAsync: createPrize.mutateAsync,

    submitContribution: submitContribution.mutate,
    submitContributionAsync: submitContribution.mutateAsync,

    evaluateContribution: evaluateContribution.mutate,
    evaluateContributionAsync: evaluateContribution.mutateAsync,

    allocateRewardsBatch: allocateRewardsBatch.mutate,
    allocateRewardsBatchAsync: allocateRewardsBatch.mutateAsync,

    computeContestantClaimReward: computeContestantClaimReward.mutate,
    computeContestantClaimRewardAsync: computeContestantClaimReward.mutateAsync,

    viewContestantClaimReward,

    moveToNextState: moveToNextState.mutate,
    moveToNextStateAsync: moveToNextState.mutateAsync,

    updateClaimStatus: updateClaimStatus.mutate,
    updateClaimStatusAsync: updateClaimStatus.mutateAsync,

    encryptScores,
    decryptReward,

    waitForTransaction,

    blockNumber: blockNumber ? Number(blockNumber) : undefined,

    canEvaluate,
    evaluate: evaluate.mutate,
    evaluateAsync: evaluate.mutateAsync,
    isPrizeOrganizer,
    addEvaluatorsAsync,
  } as const;
};

export type UsePrizeDiamondReturn = ReturnType<typeof usePrizeDiamond>;
