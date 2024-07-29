import { useCallback, useState } from 'react';
import { Address, getContract } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import { useError } from '../app/ErrorContext';

export const useContractInteraction = () => {
    const { handleError, clearError } = useError();
    const [loading, setLoading] = useState(false);
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const getContractInstance = useCallback(async (contractInfo: { address: Address; abi: any }) => {
        if (!publicClient) {
            throw new Error("Public client is not available");
        }
        return getContract({
            address: contractInfo.address,
            abi: contractInfo.abi,
            client: {
                public: publicClient,
                wallet: walletClient ?? undefined,
            },
        });
    }, [publicClient, walletClient]);

    const handleContractInteraction = useCallback(async <T>(
        interaction: (contract: ReturnType<typeof getContract>) => Promise<T>,
        errorMessage: string,
        contractAddress?: Address,
        contractAbi?: any
    ): Promise<T | null> => {
        if (!publicClient) {
            throw new Error("Public client is not available");
        }
        setLoading(true);
        clearError();
        try {
            let contract;
            if (contractAddress && contractAbi) {
                contract = await getContractInstance({ address: contractAddress, abi: contractAbi });
            } else {
                // Assuming PrizeManager contract info is available in some way
                // You might need to adjust this part based on how you're managing contract info
                throw new Error("PrizeManager contract info is not provided");
            }
            const result = await interaction(contract);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            handleError(`${errorMessage}: ${errorMessage}`, error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [publicClient, walletClient, getContractInstance, handleError, clearError]);

    return { handleContractInteraction, loading };
};