"use client";

import React, { ReactNode, useCallback, useContext, useMemo, useState, useEffect, useRef } from "react";
import {
  useAccount,
  UseAccountReturnType,
  useConnect,
  useDisconnect,
  usePublicClient,
  UsePublicClientReturnType,
  useWalletClient,
} from "wagmi";
import { ethers } from "ethers";
import { ConnectKitProvider } from "connectkit";
import { Address } from "viem";
import { FhenixClient } from "fhenixjs";
import { config } from "../config";

interface WalletContextType {
  address: Address | null;
  account: UseAccountReturnType;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publicClient: UsePublicClientReturnType;
  walletClient: ReturnType<typeof useWalletClient>["data"] | undefined;
  isLoading: boolean;
  fhenixClient: FhenixClient | null;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
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
  isLoading: true,
  fhenixClient: null,
  provider: null,
  signer: null,
};

export const WalletContext = React.createContext<WalletContextType>(defaultWalletContext);

export const useWalletContext = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [fhenixClient, setFhenixClient] = useState<FhenixClient | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const initializationAttempted = useRef(false);

  const initFhenixClient = useCallback(async () => {
    if (account.isConnected && publicClient && walletClient && !fhenixClient && !initializationAttempted.current) {
      initializationAttempted.current = true;
      try {
        const ethersProvider = new ethers.BrowserProvider((window as any).ethereum);
        const ethersSigner = await ethersProvider.getSigner();
        setProvider(ethersProvider);
        setSigner(ethersSigner);

        console.log("Initializing FhenixClient...");
        const instance = new FhenixClient({
          provider: ethersProvider,
        });

        try {
          console.log("Fetching FHE public key...");
          await instance.fhePublicKey;
          console.log("FHE public key fetched successfully");
        } catch (fheError) {
          console.error("Error fetching FHE public key:", fheError);
          throw new Error("Failed to fetch FHE public key. The network might not be FHE-enabled.");
        }

        // Check if a permit already exists
        const existingPermit = instance.getPermit(config.contracts.Diamond.address, account.address as string);
        console.log("Existing permit:", existingPermit);

        if (!existingPermit) {
          console.log("Generating new permit...");
          const permitSigner = {
            getAddress: async () => account.address as string,
            signTypedData: async (domain: any, types: any, value: any) => {
              return walletClient.signTypedData({
                domain,
                types: { Permissioned: types.Permissioned },
                primaryType: "Permissioned",
                message: value,
              });
            },
          };

          const permit = await instance.generatePermit(config.contracts.Diamond.address, ethersProvider, permitSigner);
          instance.storePermit(permit);
          console.log("New permit generated and stored");
        }

        setFhenixClient(instance);
        console.log("FhenixClient initialized successfully");
      } catch (error) {
        console.error("Error initializing FhenixClient:", error);
        initializationAttempted.current = false;
        // You might want to set an error state here to display to the user
      }
    }
  }, [account.isConnected, publicClient, walletClient, account.address, fhenixClient]);

  useEffect(() => {
    initFhenixClient();
  }, [initFhenixClient]);

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
      fhenixClient,
      provider,
      signer,
    }),
    [
      account,
      memoizedConnect,
      memoizedDisconnect,
      publicClient,
      walletClient,
      isLoading,
      fhenixClient,
      provider,
      signer,
    ],
  );

  return (
    <ConnectKitProvider>
      <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>
    </ConnectKitProvider>
  );
};
