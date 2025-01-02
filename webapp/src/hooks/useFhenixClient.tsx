import { FhenixClient } from "fhenixjs";
import { useEffect, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { JsonRpcProvider } from "ethers";

const useFhenixClient = () => {
  const [client, setClient] = useState<FhenixClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    const initFhenix = async () => {
      try {
        if (!walletClient || !publicClient) return;

        const provider = new JsonRpcProvider(
          publicClient.transport.url,
        ) as any;

        const fhenix = new FhenixClient({
          provider,
        });

        setClient(fhenix);
        setError(null);
      } catch (error) {
        console.error("Failed to initialize Fhenix client:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to initialize Fhenix client",
        );
        setClient(null);
      }
    };

    initFhenix();
  }, [walletClient, publicClient]);

  return { fhenixClient: client, fhenixError: error };
};

export default useFhenixClient;
