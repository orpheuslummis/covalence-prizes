import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useBlockNumber } from "wagmi";
import { config } from "../config";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { PrizeDetails, Role, AppContextType } from "../lib/types";

export const AppContext = createContext<AppContextType>({
  contracts: config.contracts,
  prizeDiamond: {} as ReturnType<typeof usePrizeDiamond>,
  isLoading: false,
  setIsLoading: () => {}, // Add this line
  prizes: [],
  userRoles: [],
  setUserRoles: () => {},
  blockNumber: undefined,
  refetchPrizes: async () => {},
  isPrizesLoading: false,
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

  useEffect(() => {
    if (blockNumber) {
      console.log("New block:", blockNumber.toString());
    }
  }, [blockNumber]);

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

  const {
    data: prizesData,
    refetch: refetchPrizesQuery,
    isLoading: isPrizesLoading,
  } = useQuery<PrizeDetails[], Error>({
    queryKey: ["initialPrizes"],
    queryFn: async () => {
      if (!prizeDiamond.getPrizeCount || !prizeDiamond.getPrizes) {
        throw new Error("PrizeDiamond not fully initialized");
      }
      console.log("Fetching prizes...");
      const count = await prizeDiamond.getPrizeCount();
      console.log("Prize count:", count);
      const prizes = await prizeDiamond.getPrizes(0n, count);
      console.log("Fetched prizes:", prizes);

      return prizes;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    enabled: !!prizeDiamond.getPrizeCount && !!prizeDiamond.getPrizes,
  });

  const refetchPrizes = async () => {
    console.log("Manually refetching prizes...");
    await refetchPrizesQuery();
  };

  useEffect(() => {
    console.log("Current prizes:", prizesData);
  }, [prizesData]);

  const contextValue = useMemo<AppContextType>(
    () => ({
      contracts: config.contracts,
      prizeDiamond,
      isLoading: isPrizesLoading,
      setIsLoading: () => {},
      prizes: prizesData || [],
      userRoles,
      setUserRoles,
      blockNumber: blockNumber ? Number(blockNumber) : undefined,
      refetchPrizes,
      isPrizesLoading,
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
