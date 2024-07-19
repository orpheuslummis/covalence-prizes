import { ethers } from "hardhat";
import { FheInstance } from "../utils/instance";
import { PrizeContract } from "../types";
import { ContractTransactionReceipt, EventLog } from "ethers";

export const MAX_BATCH_SIZE = 10;


export function findEventInReceipt(
    receipt: ContractTransactionReceipt | null,
    eventName: string
): EventLog | undefined {
    return receipt?.logs.find(
        (log): log is EventLog => 'eventName' in log && log.eventName === eventName
    );
}

export async function deployPrizeContract(
    organizer: string,
    description: string,
    totalRewardPool: number,
    allocationStrategyAddress: string,
    criteriaNames: string[]
): Promise<PrizeContract> {
    const PrizeContractFactory = await ethers.getContractFactory("PrizeContract");
    const prizeContract = await PrizeContractFactory.deploy(
        organizer,
        description,
        totalRewardPool,
        allocationStrategyAddress,
        criteriaNames
    );
    await prizeContract.waitForDeployment();
    return prizeContract as PrizeContract;
}

export async function encryptScores(
    instance: FheInstance,
    scores: number[][]
): Promise<string[][]> {
    return Promise.all(
        scores.map(async (contestantScores) =>
            Promise.all(contestantScores.map((score) => instance.instance.encrypt_uint32(score)))
        )
    );
}

// export async function assignScoresInBatches(
//     prizeContract: PrizeContract,
//     contestants: string[],
//     encryptedScores: string[][]
// ) {
//     const batchCount = Math.ceil(contestants.length / MAX_BATCH_SIZE);

//     for (let i = 0; i < batchCount; i++) {
//         const start = i * MAX_BATCH_SIZE;
//         const end = Math.min(start + MAX_BATCH_SIZE, contestants.length);
//         const batchSize = end - start;

//         const batchContestants = contestants.slice(start, end);
//         const batchScores = encryptedScores.slice(start, end);

//         await prizeContract.assignScores(batchContestants, batchScores);
//     }
// }

// export async function decryptAndVerifyScores(
//     instance: FheInstance,
//     prizeContract: PrizeContract,
//     contestants: string[]
// ): Promise<number[]> {
//     const decryptedScores: number[] = [];

//     for (const contestant of contestants) {
//         const encryptedScore = await prizeContract.getContestantScore(contestant);
//         const decryptedScore = await instance.instance.decrypt(encryptedScore);
//         decryptedScores.push(Number(decryptedScore));
//     }

//     return decryptedScores;
// }

export function calculateExpectedRewards(scores: number[], totalReward: number): number[] {
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    return scores.map((score) => (score / totalScore) * totalReward);
}

// export async function verifyRewardAllocation(
//     instance: FheInstance,
//     prizeContract: PrizeContract,
//     contestants: string[],
//     expectedRewards: number[]
// ): Promise<boolean> {
//     for (let i = 0; i < contestants.length; i++) {
//         const encryptedReward = await prizeContract.getContestantReward(contestants[i]);
//         const decryptedReward = await instance.instance.decrypt(encryptedReward);
//         if (Math.abs(Number(decryptedReward) - expectedRewards[i]) > 0.001) {
//             return false;
//         }
//     }
//     return true;
// }

export async function advanceToState(prizeContract: PrizeContract, targetState: number) {
    let currentState = await prizeContract.state();
    while (currentState < targetState) {
        await prizeContract.moveToNextState();
        currentState = await prizeContract.state();
    }
}

export function generateRandomScores(contestantCount: number, criteriaCount: number): number[][] {
    return Array(contestantCount)
        .fill(null)
        .map(() =>
            Array(criteriaCount)
                .fill(null)
                .map(() => Math.floor(Math.random() * 100))
        );
}