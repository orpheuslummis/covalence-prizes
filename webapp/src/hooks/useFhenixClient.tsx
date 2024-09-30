import { useState, useEffect, useCallback } from "react";
import { FhenixClient } from "fhenixjs";
import { useWalletContext } from "../contexts/WalletContext";
import { BrowserProvider } from "ethers";
import { fhenixTestnet } from "../config";
import { usePublicClient, useWalletClient } from "wagmi";

export const useFhenixClient = () => {
  const { isWalletReady } = useWalletContext();
  const [fhenixClient, setFhenixClient] = useState<FhenixClient | null>(null);
  const [fhenixError, setFhenixError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const initializeFhenixClient = useCallback(async () => {
    if (!isWalletReady || !publicClient || !walletClient || typeof window.ethereum === "undefined") {
      console.log("Conditions not met for Fhenix client initialization", {
        isWalletReady,
        hasPublicClient: !!publicClient,
        hasWalletClient: !!walletClient,
        hasEthereum: typeof window.ethereum !== "undefined",
      });
      return;
    }

    setIsInitializing(true);
    console.log("Initializing Fhenix client...");

    try {
      // Create an Ethers provider using window.ethereum
      const ethersProvider = new BrowserProvider(window.ethereum, {
        chainId: fhenixTestnet.id,
        name: fhenixTestnet.name,
      });

      // Create a Fhenix client with the Ethers provider
      const client = new FhenixClient({ provider: ethersProvider });
      setFhenixClient(client);
      setFhenixError(null);
      console.log("Fhenix client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Fhenix client:", error);
      setFhenixError((error as Error).message || "Unknown error initializing Fhenix client");
    } finally {
      setIsInitializing(false);
    }
  }, [isWalletReady, publicClient, walletClient]);

  useEffect(() => {
    console.log("useFhenixClient: Effect triggered", {
      isWalletReady,
      hasPublicClient: !!publicClient,
      hasWalletClient: !!walletClient,
      hasEthereum: typeof window.ethereum !== "undefined",
    });

    if (
      isWalletReady &&
      !fhenixClient &&
      !isInitializing &&
      publicClient &&
      walletClient &&
      typeof window.ethereum !== "undefined"
    ) {
      initializeFhenixClient();
    }
  }, [isWalletReady, fhenixClient, isInitializing, initializeFhenixClient, publicClient, walletClient]);

  return { fhenixClient, fhenixError, isInitializing };
};
