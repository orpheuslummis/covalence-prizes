import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { getPrizeContract } from '../utils/prizeContractAPI';

export interface Prize {
    id: number;
    name: string;
    description: string;
    amount: string;
    prizeAddress: string;
    totalRewardPool: string;
    active: boolean;
}

export const usePrizes = () => {
    const { web3 } = useAppContext();
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrizes = async () => {
            if (!web3 || !web3.provider || !web3.isConnected) {
                setError('Web3 is not connected. Please connect your wallet.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const signer = await web3.provider.getSigner();
                const contract = await getPrizeContract(signer);
                const prizeCount = await contract.getPrizeCount();
                const fetchedPrizes: Prize[] = [];

                for (let i = 0; i < prizeCount.toNumber(); i++) {
                    const prize = await contract.allPrizes(i);
                    fetchedPrizes.push({
                        id: i,
                        prizeAddress: prize.prizeAddress,
                        description: prize.description,
                        totalRewardPool: ethers.formatEther(prize.totalRewardPool),
                        active: prize.active
                    });
                }

                setPrizes(fetchedPrizes);
            } catch (err) {
                console.error('Error fetching prizes:', err);
                if (err instanceof Error) {
                    setError(`Failed to fetch prizes: ${err.message}`);
                } else {
                    setError('An unexpected error occurred while fetching prizes.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPrizes();
    }, [web3]);

    return { prizes, loading, error };
};