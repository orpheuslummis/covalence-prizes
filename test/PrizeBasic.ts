import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import dotenv from 'dotenv';
import { parseEther } from "ethers";
import { FhenixClient } from "fhenixjs";
import hre, { ethers } from "hardhat";
import { IAllocationStrategy, PrizeManager, StrategyRegistry } from "../types";
import { FheInstance, createFheInstance } from "../utils/instance";
import { findEventInReceipt } from "./lib";
import { ensureAddressesExist, transferTokensIfNeeded } from "./utils";

dotenv.config();

enum PrizeState { Setup, Open, Evaluating, Rewarding, Closed, Cancelled }

const TEST_TIMEOUT = 1 * 60 * 1000;
const REWARD_POOL = ethers.parseEther("0.014");
const MINIMUM_BALANCE = parseEther("0.05");
const MINIMUM_ORGANIZER_BALANCE = parseEther("0.2");

async function hasEnoughBalance(address: string, requiredBalance: bigint): Promise<boolean> {
    return await ethers.provider.getBalance(address) >= requiredBalance;
}

describe("PrizeBasic", function () {
    this.timeout(TEST_TIMEOUT);

    let prizeManager: PrizeManager;
    let allocationStrategy: IAllocationStrategy;
    let strategyRegistry: StrategyRegistry;
    let fheInstance: FheInstance;
    let organizer: SignerWithAddress, evaluator1: SignerWithAddress, evaluator2: SignerWithAddress;
    let contestant1: SignerWithAddress, contestant2: SignerWithAddress;
    let client: FhenixClient;

    const setupAccounts = async () => {
        const [signer] = await hre.ethers.getSigners();
        if (!signer) throw new Error("Failed to get signer.");

        organizer = signer;
        if (await ethers.provider.getBalance(organizer.address) < MINIMUM_ORGANIZER_BALANCE) {
            throw new Error("Insufficient organizer balance");
        }

        evaluator1 = new ethers.Wallet(process.env.PRIVATE_KEY_1!, hre.ethers.provider);
        evaluator2 = new ethers.Wallet(process.env.PRIVATE_KEY_2!, hre.ethers.provider);
        contestant1 = new ethers.Wallet(process.env.PRIVATE_KEY_3!, hre.ethers.provider);
        contestant2 = new ethers.Wallet(process.env.PRIVATE_KEY_4!, hre.ethers.provider);

        const addresses = [organizer, evaluator1, evaluator2, contestant1, contestant2].map(a => a.address);
        await ensureAddressesExist(addresses, organizer);
    };

    const setupContracts = async () => {
        const [owner] = await hre.ethers.getSigners();

        strategyRegistry = await (await hre.ethers.getContractFactory("StrategyRegistry")).connect(owner).deploy();
        await strategyRegistry.waitForDeployment();

        prizeManager = await (await hre.ethers.getContractFactory("PrizeManager")).connect(owner).deploy(await strategyRegistry.getAddress());
        await prizeManager.waitForDeployment();

        allocationStrategy = await (await hre.ethers.getContractFactory("AllocationStrategyLinear")).connect(owner).deploy() as IAllocationStrategy;
        await allocationStrategy.waitForDeployment();

        await strategyRegistry.setStrategyAddress("AllocationStrategyLinear", await allocationStrategy.getAddress());

        fheInstance = await createFheInstance(hre, await prizeManager.getAddress());
        client = fheInstance.instance;
    };

    const ensureAccountBalances = async () => {
        for (const account of [evaluator1, evaluator2, contestant1, contestant2]) {
            await transferTokensIfNeeded(organizer, account.address, MINIMUM_BALANCE);
        }
    };

    before(setupAccounts);
    beforeEach(async () => {
        await setupContracts();
        await ensureAccountBalances();
    });

    it("should complete a basic prize scenario", async function () {
        // Check if evaluators have sufficient balance before proceeding
        for (const evaluator of [evaluator1, evaluator2]) {
            const balance = await ethers.provider.getBalance(evaluator.address);
            if (balance < MINIMUM_BALANCE) {
                console.warn(`Evaluator ${evaluator.address} has insufficient balance. Skipping test.`);
                this.skip();
            }
        }

        console.log("Creating prize...");
        let tx;
        try {
            tx = await prizeManager.connect(organizer).createPrize(
                "Test Prize",
                REWARD_POOL,
                "AllocationStrategyLinear",
                ["Quality", "Innovation", "Feasibility"],
                { value: REWARD_POOL }
            );
        } catch (error) {
            console.error("Error creating prize:", error);
            if (error.message.includes("insufficient funds")) {
                console.warn("Organizer may not have enough balance. Skipping test.");
                this.skip();
            }
            throw error;
        }

        const receipt = await tx.wait(1);
        if (!receipt) {
            throw new Error("Failed to get transaction receipt");
        }
        console.log("Prize creation gas used:", receipt.gasUsed.toString());

        const feeData = await ethers.provider.getFeeData();
        if (!feeData.gasPrice) {
            console.warn("Gas price not available");
        } else {
            const cost = receipt.gasUsed * feeData.gasPrice;
            console.log("Prize creation transaction cost:", ethers.formatEther(cost), "ETH");
        }

        const prizeAddress = findEventInReceipt(receipt, 'PrizeCreated')?.args?.prizeAddress;
        if (!prizeAddress) throw new Error('Failed to get prize address');
        console.log("Prize address:", prizeAddress);

        const prizeContract = await ethers.getContractAt("PrizeContract", prizeAddress);
        console.log("Prize contract object:", prizeContract);
        console.log("Prize contract address:", prizeContract.target);

        try {
            const description = await prizeContract.description();
            console.log("Prize description:", description);
        } catch (error) {
            console.error("Error calling description():", error);
        }

        if (!prizeContract.target) {
            throw new Error("Failed to initialize prize contract");
        }

        console.log("Organizer address:", organizer.address);
        console.log("Prize contract address:", prizeContract.target);

        expect(await prizeContract.description()).to.equal("Test Prize");
        expect(await prizeContract.state()).to.equal(PrizeState.Setup);

        if (!evaluator1 || !evaluator2) {
            throw new Error("Evaluators are not properly initialized");
        }

        console.log("State after creation:", await prizeContract.state());
        console.log("Adding evaluators...");
        await prizeContract.connect(organizer).addEvaluators([evaluator1.address, evaluator2.address]);
        console.log("State after adding evaluators:", await prizeContract.state());

        expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator1.address)).to.be.true;
        expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator2.address)).to.be.true;

        console.log("Moving to next state...");
        await prizeContract.connect(organizer).moveToNextState();
        console.log("State after moving to next state:", await prizeContract.state());

        expect(await prizeContract.state()).to.equal(PrizeState.Open);
        expect(await ethers.provider.getBalance(prizeAddress)).to.equal(REWARD_POOL);

        console.log("Submitting contributions...");
        for (const [index, contestant] of [contestant1, contestant2].entries()) {
            try {
                let tx = await prizeContract.connect(contestant).submitContribution(`Contestant ${index + 1} FHE Innovation`);
                let receipt = await tx.wait(1);
                if (!receipt) {
                    throw new Error(`Failed to get receipt for contestant ${index + 1} submission`);
                }
                console.log(`Contestant ${index + 1} submission gas used:`, receipt.gasUsed.toString());

                const feeData = await contestant.provider.getFeeData();
                if (!feeData.gasPrice) {
                    throw new Error("Unable to get gas price");
                }

                const cost = receipt.gasUsed * feeData.gasPrice;

                console.log(`Contestant ${index + 1} submission cost:`, ethers.formatEther(cost), "ETH");
            } catch (error) {
                console.error(`Error submitting contribution for contestant ${index + 1}:`, error);
                throw error;
            }
        }

        expect((await prizeContract.contributions(contestant1.address)).description).to.equal("Contestant 1 FHE Innovation");
        expect((await prizeContract.contributions(contestant2.address)).description).to.equal("Contestant 2 FHE Innovation");

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

        const scores = [[[80, 70, 90], [75, 85, 80]], [[85, 75, 88], [78, 82, 85]]];
        for (let i = 0; i < 2; i++) {
            const evaluator = i === 0 ? evaluator1 : evaluator2;
            console.log(`\nEvaluator ${i + 1} (${evaluator.address}) assigning scores...`);

            const encryptedScores = await Promise.all(scores[i].map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            console.log("Scores encrypted");

            const connectedPrizeContract = prizeContract.connect(evaluator);

            const gasEstimate = await connectedPrizeContract.assignScores.estimateGas(
                [contestant1.address, contestant2.address],
                encryptedScores
            );
            console.log(`Estimated gas for assignScores: ${gasEstimate.toString()}`);

            const feeData = await ethers.provider.getFeeData();
            const gasPrice = feeData.gasPrice;

            if (!gasPrice) {
                throw new Error("Unable to get gas price");
            }

            console.log(`Current gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

            const evaluatorBalance = await ethers.provider.getBalance(evaluator.address);
            console.log(`Evaluator balance: ${ethers.formatEther(evaluatorBalance)} ETH`);

            const estimatedCost = gasEstimate * gasPrice;
            console.log(`Estimated transaction cost: ${ethers.formatEther(estimatedCost)} ETH`);

            if (!await hasEnoughBalance(evaluator.address, estimatedCost)) {
                console.warn(`Warning: Evaluator ${i + 1} doesn't have enough balance. Skipping...`);
                continue;
            }

            try {
                const tx = await connectedPrizeContract.assignScores(
                    [contestant1.address, contestant2.address],
                    encryptedScores
                );
                console.log(`Transaction sent. Hash: ${tx.hash}`);

                const receipt = await tx.wait(1);
                console.log(`Transaction confirmed. Gas used: ${receipt.gasUsed.toString()}`);
                console.log(`Gas used type: ${typeof receipt.gasUsed}`);
                console.log(`Gas price: ${receipt.gasPrice.toString()}`);
                console.log(`Gas price type: ${typeof receipt.gasPrice}`);
                const transactionCost = receipt.gasUsed * receipt.gasPrice;
                console.log(`Actual transaction cost: ${ethers.formatEther(transactionCost)} ETH`);

                expect(findEventInReceipt(receipt, 'ScoresAssigned')).to.not.be.undefined;
            } catch (error) {
                console.error(`Error assigning scores for Evaluator ${i + 1}:`, error);
                throw error;
            }
        }

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);
        await prizeContract.connect(organizer).allocateRewards();

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Closed);

        for (const contestant of [contestant1, contestant2]) {
            const balanceBefore = await hre.ethers.provider.getBalance(contestant.address);
            const tx = await prizeContract.connect(contestant).claimReward();
            const receipt = await tx.wait(1);
            const feeData = await ethers.provider.getFeeData();
            if (!feeData.gasPrice) {
                throw new Error("Unable to get gas price");
            }
            const gasCost = receipt.gasUsed * feeData.gasPrice;
            const balanceAfter = await hre.ethers.provider.getBalance(contestant.address);
            expect(balanceAfter + gasCost).to.be.gt(balanceBefore);
        }

        expect(await hre.ethers.provider.getBalance(prizeAddress)).to.be.closeTo(ethers.parseEther("0"), ethers.parseEther("0.000001"));
    });
});