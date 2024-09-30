import { ConnectKitProvider } from "connectkit";
import React, { ReactNode, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { Address } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  UsePublicClientReturnType,
  useWalletClient,
} from "wagmi";

interface WalletContextType {
  address: Address | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publicClient: UsePublicClientReturnType;
  walletClient: ReturnType<typeof useWalletClient>["data"] | undefined;
  isLoading: boolean;
  account: ReturnType<typeof useAccount>;
  isWalletReady: boolean;
}

const WalletContext = React.createContext<WalletContextType | undefined>(undefined);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient();
  const [isWalletReady, setIsWalletReady] = useState(false);

  useEffect(() => {
    console.log("WalletContext: Checking wallet readiness", {
      isConnected: account.isConnected,
      hasWalletClient: !!walletClient,
      hasPublicClient: !!publicClient,
    });

    if (account.isConnected && walletClient && publicClient) {
      console.log("WalletContext: Setting isWalletReady to true");
      setIsWalletReady(true);
    } else {
      console.log("WalletContext: Setting isWalletReady to false");
      setIsWalletReady(false);
    }
  }, [account.isConnected, walletClient, publicClient]);

  const memoizedConnect = useCallback(async () => {
    if (connectors.length > 0) {
      try {
        await connect({ connector: connectors[0] });
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    }
  }, [connect, connectors]);

  const memoizedDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  const isLoading = account.isConnecting || account.isReconnecting || isWalletLoading;

  useEffect(() => {
    if (account.isConnected && walletClient && publicClient) {
      setIsWalletReady(true);
    } else {
      setIsWalletReady(false);
    }
  }, [account.isConnected, walletClient, publicClient]);

  const contextValue = useMemo<WalletContextType>(
    () => ({
      address: account.address || null,
      isConnected: account.isConnected,
      connect: memoizedConnect,
      disconnect: memoizedDisconnect,
      publicClient,
      walletClient,
      isLoading,
      account,
      isWalletReady,
    }),
    [account, memoizedConnect, memoizedDisconnect, publicClient, walletClient, isLoading, isWalletReady],
  );

  console.log("WalletContext: Current state", { isWalletReady, isConnected: account.isConnected });

  return (
    <ConnectKitProvider>
      <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>
    </ConnectKitProvider>
  );
};
