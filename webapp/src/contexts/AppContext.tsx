/**
 * Provides a React context for managing global application state. This context uses
 * React's built-in context API and TanStack Query for data fetching and caching.
 * It provides access to contract instances, prize details, user roles, and functions
 * for interacting with the Prize Diamond contract.  It also includes the `fhenixClient`
 * for interacting with Fhenix.  The context ensures data consistency and efficient
 * updates through TanStack Query's caching and invalidation mechanisms.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useBlockNumber } from "wagmi";
import { config } from "../config";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { PrizeDetails, Role } from "../lib/types";
import { Address } from "viem";
import { useWalletContext } from "./WalletContext";
import { useFhenixClient } from "../hooks/useFhenixClient";
import { FhenixClient } from "fhenixjs";

export interface AppContextType {
  contracts: typeof config.contracts;
  prizeDiamond: ReturnType<typeof usePrizeDiamond>;
  isLoading: boolean;
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
  fhenixClient: FhenixClient | null;
  fhenixError: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address } = useWalletContext();
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { fhenixClient, fhenixError } = useFhenixClient();
  const prizeDiamond = usePrizeDiamond(fhenixClient);

  const fetchPrizes = useCallback(async () => {
    if (!prizeDiamond.getPrizeCount || !prizeDiamond.getPrizes) {
      throw new Error("PrizeDiamond not fully initialized");
    }
    const count = await prizeDiamond.getPrizeCount();
    const prizes = await prizeDiamond.getPrizes(0n, count);
    console.log("Fetched prizes:", prizes);
    return prizes;
  }, [prizeDiamond]);

  const {
    data: prizesData,
    refetch: refetchPrizesQuery,
    isLoading: isPrizesLoading,
  } = useQuery<PrizeDetails[], Error>({
    queryKey: ["allPrizes"],
    queryFn: fetchPrizes,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    enabled: !!prizeDiamond.getPrizeCount && !!prizeDiamond.getPrizes,
  });

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
    await refetchPrizesQuery();
  }, [refetchPrizesQuery]);

  const contextValue = useMemo<AppContextType>(
    () => ({
      contracts: config.contracts,
      prizeDiamond,
      isLoading: isPrizesLoading,
      prizes: prizesData || [],
      userRoles,
      setUserRoles,
      blockNumber: blockNumber ? Number(blockNumber) : undefined,
      refetchPrizes,
      isPrizesLoading,
      allocateRewardsBatch: (params) => prizeDiamond.allocateRewardsBatchAsync(params),
      getAllocationDetails: (prizeId) => prizeDiamond.getAllocationDetails(prizeId),
      hasClaimableReward: (prizeId, address) => prizeDiamond.hasClaimableReward(prizeId, address),
      claimReward: (prizeId) => prizeDiamond.computeContestantClaimRewardAsync({ prizeId }).then(() => {}),
      fhenixClient,
      fhenixError,
    }),
    [
      prizeDiamond,
      isPrizesLoading,
      prizesData,
      userRoles,
      blockNumber,
      refetchPrizes,
      address,
      fhenixClient,
      fhenixError,
    ],
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
