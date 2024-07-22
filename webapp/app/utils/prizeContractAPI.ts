import { ethers } from 'ethers';
import { config } from '../config';

const PRIZE_MANAGER_ADDRESS = config.contracts.PrizeManager.address;
const PRIZE_MANAGER_ABI = config.contracts.PrizeManager.abi;

export async function getPrizeManager(signer: ethers.Signer) {
    if (!PRIZE_MANAGER_ADDRESS) {
        throw new Error('Prize manager address is not defined');
    }
    return new ethers.Contract(PRIZE_MANAGER_ADDRESS, PRIZE_MANAGER_ABI, signer);
}

export async function getAllPrizes(contract: ethers.Contract) {
    return contract.getAllPrizes();
}

export async function createPrize(contract: ethers.Contract, description: string, amount: string, allocationStrategy: string, criteriaNames: string[]) {
    const tx = await contract.createPrize(description, ethers.parseEther(amount), allocationStrategy, criteriaNames, { value: ethers.parseEther(amount) });
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