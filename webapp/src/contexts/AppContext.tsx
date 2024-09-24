import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useBlockNumber } from "wagmi";
import { config } from "../config";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { PrizeDetails, Role } from "../lib/types";
import { Address } from "viem";

export interface AppContextType {
  contracts: typeof config.contracts;
  prizeDiamond: ReturnType<typeof usePrizeDiamond>;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  prizes: PrizeDetails[];
  userRoles: Role[];
  setUserRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  blockNumber: number | undefined;
  refetchPrizes: () => Promise<void>;
  isPrizesLoading: boolean;
  allocateRewardsBatch: (params: { prizeId: bigint; batchSize: bigint }) => Promise<void>;
  getAllocationDetails: (prizeId: bigint) => Promise<{
    lastProcessedIndex: bigint;
    contributionCount: bigint;
    rewardsAllocated: boolean;
  }>;
  hasClaimableReward: (prizeId: bigint, address: Address) => Promise<boolean>;
  claimReward: (prizeId: bigint) => Promise<void>;
}

export const AppContext = createContext<AppContextType>({
  contracts: config.contracts,
  prizeDiamond: {} as ReturnType<typeof usePrizeDiamond>,
  isLoading: false,
  setIsLoading: () => {},
  prizes: [],
  userRoles: [],
  setUserRoles: () => {},
  blockNumber: undefined,
  refetchPrizes: async () => {},
  isPrizesLoading: false,
  allocateRewardsBatch: async () => {},
  getAllocationDetails: async () => ({
    lastProcessedIndex: 0n,
    contributionCount: 0n,
    rewardsAllocated: false,
  }),
  hasClaimableReward: async () => false,
  claimReward: async () => {},
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const prizeDiamond = usePrizeDiamond();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const fetchPrizes = useCallback(async () => {
    if (!prizeDiamond.getPrizeCount || !prizeDiamond.getPrizes) {
      throw new Error("PrizeDiamond not fully initialized");
    }
    console.log("Fetching prizes...");
    const count = await prizeDiamond.getPrizeCount();
    console.log("Prize count:", count);
    const prizes = await prizeDiamond.getPrizes(0n, count);
    console.log("Fetched prizes:", prizes);
    return prizes;
  }, [prizeDiamond]);

  const {
    data: prizesData,
    refetch: refetchPrizesQuery,
    isLoading: isPrizesLoading,
  } = useQuery<PrizeDetails[], Error>({
    queryKey: ["initialPrizes"],
    queryFn: fetchPrizes,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    enabled: !!prizeDiamond.getPrizeCount && !!prizeDiamond.getPrizes,
  });

  useEffect(() => {
    if (blockNumber) {
      console.log("New block:", blockNumber.toString());
      refetchPrizesQuery();
    }
  }, [blockNumber, refetchPrizesQuery]);

  // Setup Query Persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
      });

      persistQueryClient({
        queryClient,
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      });
    }
  }, []);

  const refetchPrizes = useCallback(async () => {
    console.log("Manually refetching prizes...");
    await refetchPrizesQuery();
  }, [refetchPrizesQuery]);

  useEffect(() => {
    console.log("Current prizes:", prizesData);
  }, [prizesData]);

  const contextValue = useMemo<AppContextType>(
    () => ({
      contracts: config.contracts,
      prizeDiamond,
      isLoading: isPrizesLoading,
      setIsLoading: () => {}, // Implement if needed
      prizes: prizesData || [],
      userRoles,
      setUserRoles,
      blockNumber: blockNumber ? Number(blockNumber) : undefined,
      refetchPrizes,
      isPrizesLoading,
      allocateRewardsBatch: (params) => prizeDiamond.allocateRewardsBatchAsync(params),
      getAllocationDetails: (prizeId) => prizeDiamond.getAllocationDetails(prizeId),
      hasClaimableReward: prizeDiamond.hasClaimableReward,
      claimReward: (prizeId) => prizeDiamond.computeContestantClaimRewardAsync({ prizeId }),
    }),
    [prizeDiamond, isPrizesLoading, prizesData, userRoles, blockNumber, refetchPrizes],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
    </QueryClientProvider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
