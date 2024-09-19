"use client";

import React, { ReactNode, useCallback, useContext, useMemo } from "react";
import { WalletClient } from "viem";
import { Address } from "viem";
import {
  useAccount,
  UseAccountReturnType,
  useConnect,
  useDisconnect,
  usePublicClient,
  UsePublicClientReturnType,
  useWalletClient,
} from "wagmi";

interface WalletContextType {
  address: Address | null;
  account: UseAccountReturnType;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publicClient: UsePublicClientReturnType;
  walletClient: WalletClient | undefined;
  isLoading: boolean; // Added loading state
}

const defaultWalletContext: WalletContextType = {
  address: null,
  account: {
    address: undefined,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isReconnecting: false,
    status: "disconnected",
  } as UseAccountReturnType,
  connect: async () => {},
  disconnect: async () => {},
  publicClient: null as unknown as UsePublicClientReturnType,
  walletClient: undefined,
  isLoading: true, // Initialize as loading
};

export const WalletContext = React.createContext<WalletContextType>(defaultWalletContext);

export const useWalletContext = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const memoizedConnect = useCallback(async () => {
    if (connectors.length > 0) {
      await connect({ connector: connectors[0] });
    }
  }, [connect, connectors]);

  const memoizedDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  const isLoading = account.isConnecting || (connectors.length > 0 && !account.isConnected && !account.isDisconnected);

  const contextValue = useMemo<WalletContextType>(
    () => ({
      address: account.address as Address | null,
      account,
      connect: memoizedConnect,
      disconnect: memoizedDisconnect,
      publicClient,
      walletClient,
      isLoading,
    }),
    [account, memoizedConnect, memoizedDisconnect, publicClient, walletClient, isLoading],
  );

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
};
