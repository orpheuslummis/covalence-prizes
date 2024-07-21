import { ethers } from 'ethers';
import { PRIZE_CONTRACT_ABI } from './utils/constants';

const PRIZE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PRIZE_CONTRACT_ADDRESS;

export async function getPrizeContract(signer: ethers.Signer) {
    if (!PRIZE_CONTRACT_ADDRESS) {
        throw new Error('Prize contract address is not defined');
    }
    return new ethers.Contract(PRIZE_CONTRACT_ADDRESS, PRIZE_CONTRACT_ABI, signer);
}

export async function getAllPrizes(contract: ethers.Contract) {
    return contract.getAllPrizes();
}

export async function createPrize(contract: ethers.Contract, name: string, description: string, amount: string) {
    const tx = await contract.createPrize(name, description, ethers.parseEther(amount), { value: ethers.parseEther(amount) });
    return tx.wait();
}

export async function submitContribution(contract: ethers.Contract, prizeId: number, contribution: string) {
    const tx = await contract.submitContribution(prizeId, contribution);
    return tx.wait();
}

export async function assignScores(contract: ethers.Contract, prizeId: number, contributionIds: number[], scores: number[]) {
    const tx = await contract.assignScores(prizeId, contributionIds, scores);
    return tx.wait();
}

export async function claimReward(contract: ethers.Contract, prizeId: number) {
    const tx = await contract.claimReward(prizeId);
    return tx.wait();
}