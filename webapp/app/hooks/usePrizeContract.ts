import { ethers } from 'ethers';
import { useCallback } from 'react';
import { getContractAddress } from '../contractAddresses';
import { useWeb3 } from '../hooks/useWeb3';
import { PRIZE_CONTRACT_ABI } from '../utils/constants';

export function usePrizeContract(web3: ReturnType<typeof useWeb3>) {
    const getContract = useCallback(async () => {
        if (!web3 || !web3.isConnected || !web3.provider) {
            throw new Error("No signer available. Please connect your wallet.");
        }
        const signer = await web3.provider.getSigner();
        const contractAddress = getContractAddress('PrizeContract');
        return new ethers.Contract(contractAddress, PRIZE_CONTRACT_ABI, signer);
    }, [web3]);

    const getAllPrizes = useCallback(async () => {
        const contract = await getContract();
        return contract.getAllPrizes();
    }, [getContract]);

    const createPrize = useCallback(async (name: string, description: string, amount: string) => {
        const contract = await getContract();
        try {
            const tx = await contract.createPrize(name, description, ethers.parseEther(amount), { value: ethers.parseEther(amount) });
            return await tx.wait();
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create prize: ${error.message}`);
            }
            throw new Error('An unexpected error occurred while creating the prize');
        }
    }, [getContract]);

    const submitContribution = useCallback(async (prizeId: number, contribution: string) => {
        const contract = await getContract();
        const tx = await contract.submitContribution(prizeId, contribution);
        return tx.wait();
    }, [getContract]);

    const assignScores = useCallback(async (prizeId: number, contributionIds: number[], scores: number[]) => {
        const contract = await getContract();
        const tx = await contract.assignScores(prizeId, contributionIds, scores);
        return tx.wait();
    }, [getContract]);

    const claimReward = useCallback(async (prizeId: number) => {
        const contract = await getContract();
        const tx = await contract.claimReward(prizeId);
        return tx.wait();
    }, [getContract]);

    return {
        getAllPrizes,
        createPrize,
        submitContribution,
        assignScores,
        claimReward,
    };
}