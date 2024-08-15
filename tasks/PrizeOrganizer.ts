/**
 * Organizer Tasks for Prize Management
 * 
 * This file contains a set of Hardhat tasks for prize organizers to manage prizes.
 * 
 * Usage:
 * npx hardhat organizer:createPrize --description "My Prize" --rewardpool "1.0" --strategy "LinearAllocation" --criteria "Quality,Innovation,Feasibility"
 * npx hardhat organizer:addEvaluators --prizeaddress "0x123..." --evaluators "0xabc...,0xdef..."
 * npx hardhat organizer:assignWeights --prizeaddress "0x123..." --weights "30,30,40"
 * npx hardhat organizer:moveToNextState --prizeaddress "0x123..."
 * npx hardhat organizer:allocateRewards --prizeaddress "0x123..."
 * npx hardhat organizer:getPrizeInfo --prizeaddress "0x123..."
 * 
 * Note: Replace "0x123..." with actual prize contract addresses and "0xabc...,0xdef..." with actual evaluator addresses.
 */

import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getContractHash } from "../deploy/deploy";
import { PrizeContract, PrizeManager } from "../types";

// Helper function to get PrizeManager contract
async function getPrizeManager(hre: HardhatRuntimeEnvironment): Promise<PrizeManager> {
    const { deployments, ethers } = hre;
    const prizeManagerHash = getContractHash('PrizeManager');
    const prizeManagerName = `PrizeManager_${prizeManagerHash}`;
    const PrizeManagerDeployment = await deployments.get(prizeManagerName);
    return await ethers.getContractAt("PrizeManager", PrizeManagerDeployment.address) as PrizeManager;
}

// Task to create a new prize
task("organizer:createPrize")
    .addParam("description", "Description of the prize")
    .addParam("rewardpool", "Total reward pool for the prize")
    .addParam("strategy", "Allocation strategy name")
    .addParam("criteria", "Comma-separated list of criteria names")
    .setAction(async (taskArgs, hre) => {
        const prizeManager = await getPrizeManager(hre);
        const [organizer] = await hre.ethers.getSigners();

        const { description, strategy } = taskArgs;
        const rewardPool = hre.ethers.parseEther(taskArgs.rewardpool);
        const criteriaNames = taskArgs.criteria.split(",");

        const tx = await prizeManager.connect(organizer).createPrize(
            description,
            rewardPool,
            strategy,
            criteriaNames,
            { value: rewardPool }
        );

        const receipt = await tx.wait();
        const prizeAddress = receipt?.logs.find((log: any) => log.eventName === "PrizeCreated")?.args?.prizeAddress;

        console.log(`Prize created at address: ${prizeAddress}`);
        return prizeAddress;
    });

// Task to add evaluators to a prize
task("organizer:addEvaluators")
    .addParam("prizeaddress", "Address of the prize contract")
    .addParam("evaluators", "Comma-separated list of evaluator addresses")
    .setAction(async (taskArgs, hre) => {
        const [organizer] = await hre.ethers.getSigners();
        const prizeContract = await hre.ethers.getContractAt("PrizeContract", taskArgs.prizeaddress) as PrizeContract;

        const evaluators = taskArgs.evaluators.split(",");
        await prizeContract.connect(organizer).addEvaluators(evaluators);

        console.log(`Evaluators added to prize at ${taskArgs.prizeaddress}`);
    });

// Task to assign criteria weights
task("organizer:assignWeights")
    .addParam("prizeaddress", "Address of the prize contract")
    .addParam("weights", "Comma-separated list of weights")
    .setAction(async (taskArgs, hre) => {
        const [organizer] = await hre.ethers.getSigners();
        const prizeContract = await hre.ethers.getContractAt("PrizeContract", taskArgs.prizeaddress) as PrizeContract;

        const weights = taskArgs.weights.split(",").map((w: string) => parseInt(w));
        await prizeContract.connect(organizer).assignCriteriaWeights(weights);

        console.log(`Criteria weights assigned to prize at ${taskArgs.prizeaddress}`);
    });

// Task to move the prize to the next state
task("organizer:moveToNextState")
    .addParam("prizeaddress", "Address of the prize contract")
    .setAction(async (taskArgs, hre) => {
        const [organizer] = await hre.ethers.getSigners();
        const prizeContract = await hre.ethers.getContractAt("PrizeContract", taskArgs.prizeaddress) as PrizeContract;

        await prizeContract.connect(organizer).moveToNextState();

        const newState = await prizeContract.getCurrentState();
        console.log(`Prize at ${taskArgs.prizeaddress} moved to state: ${newState}`);
    });

// Task to allocate rewards
task("organizer:allocateRewards")
    .addParam("prizeaddress", "Address of the prize contract")
    .setAction(async (taskArgs, hre) => {
        const [organizer] = await hre.ethers.getSigners();
        const prizeContract = await hre.ethers.getContractAt("PrizeContract", taskArgs.prizeaddress) as PrizeContract;

        await prizeContract.connect(organizer).allocateRewards();

        console.log(`Rewards allocated for prize at ${taskArgs.prizeaddress}`);
    });

// Task to get prize information
task("organizer:getPrizeInfo")
    .addParam("prizeaddress", "Address of the prize contract")
    .setAction(async (taskArgs, hre) => {
        const prizeContract = await hre.ethers.getContractAt("PrizeContract", taskArgs.prizeaddress) as PrizeContract;

        const description = await prizeContract.description();
        const state = await prizeContract.getCurrentState();
        const contestantCount = await prizeContract.getContestantCount();
        const evaluatorCount = await prizeContract.getEvaluatorCount();

        console.log(`Prize Info for ${taskArgs.prizeaddress}:`);
        console.log(`Description: ${description}`);
        console.log(`Current State: ${state}`);
        console.log(`Number of Contestants: ${contestantCount}`);
        console.log(`Number of Evaluators: ${evaluatorCount}`);
    });