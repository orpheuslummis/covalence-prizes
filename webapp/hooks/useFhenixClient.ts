import { FhenixClient } from 'fhenixjs';
import { useCallback, useState } from 'react';
import { Address, Hex } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

type PermitSigner = {
    getAddress: () => Promise<string>;
    signTypedData: (domain: any, types: any, value: any) => Promise<Hex>;
};

export function useFhenixClient(contractAddress?: Address) {
    const [fheClient, setFheClient] = useState<FhenixClient | null>(null);
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const getFheClient = useCallback(async (): Promise<FhenixClient> => {
        if (fheClient) return fheClient;

        if (!contractAddress || !walletClient || !publicClient) {
            throw new Error('Missing required dependencies for FHE client initialization');
        }

        try {
            const instance = new FhenixClient({
                provider: publicClient,
            });

            await instance.fhePublicKey;

            const permitSigner: PermitSigner = {
                getAddress: async () => walletClient.account.address,
                signTypedData: async (domain, types, value) => {
                    return walletClient.signTypedData({
                        domain,
                        types: { Permissioned: types.Permissioned },
                        primaryType: 'Permissioned',
                        message: value
                    });
                }
            };

            const permit = await instance.generatePermit(
                contractAddress,
                publicClient,
                permitSigner
            );
            instance.storePermit(permit);

            setFheClient(instance);
            return instance;
        } catch (error) {
            console.error('Error initializing FHE client:', error);
            throw error;
        }
    }, [contractAddress, walletClient, publicClient, fheClient]);

    return { fheClient, getFheClient };
}