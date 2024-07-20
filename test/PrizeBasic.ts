// NOTE: we run this on testnet, local devnet doesn't work.
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

const TEST_TIMEOUT = 1 * 60 * 1000; // 1 minutes

// Add this function at the top of your file
async function hasEnoughBalance(address: string, requiredBalance: bigint): Promise<boolean> {
    const balance = await ethers.provider.getBalance(address);
    return balance >= requiredBalance;
}

describe("PrizeBasic", function () {
    this.timeout(TEST_TIMEOUT); // Set timeout for all tests in this describe block

    let prizeManager: PrizeManager;
    let allocationStrategy: IAllocationStrategy;
    let strategyRegistry: StrategyRegistry;
    let fheInstance: FheInstance;
    let organizer: SignerWithAddress, evaluator1: SignerWithAddress, evaluator2: SignerWithAddress;
    let contestant1: SignerWithAddress, contestant2: SignerWithAddress;
    let client: FhenixClient;

    const rewardPool = ethers.parseEther("0.014"); // Update this value to match the actual reward pool
    const description = "Test Prize";
    const criteriaNames = ["Quality", "Innovation", "Feasibility"];
    const weights = [30, 30, 40];

    const minimumBalance = parseEther("0.05"); // Minimum balance required for tests
    const minimumOrganizerBalance = parseEther("0.2"); // Minimum balance required for organizer

    before(async () => {
        const [signer] = await hre.ethers.getSigners();
        if (!signer) {
            throw new Error("Failed to get signer. Make sure your Hardhat configuration provides at least one account.");
        }

        organizer = signer;

        // Check if organizer has sufficient balance
        const organizerBalance = await ethers.provider.getBalance(organizer.address);
        if (organizerBalance < minimumOrganizerBalance) {
            console.warn(`Organizer ${organizer.address} has insufficient balance. Aborting all tests.`);
            throw new Error("Insufficient organizer balance");
        }

        // Use predefined accounts from .env
        evaluator1 = new ethers.Wallet(process.env.PRIVATE_KEY_1!, hre.ethers.provider);
        evaluator2 = new ethers.Wallet(process.env.PRIVATE_KEY_2!, hre.ethers.provider);
        contestant1 = new ethers.Wallet(process.env.PRIVATE_KEY_3!, hre.ethers.provider);
        contestant2 = new ethers.Wallet(process.env.PRIVATE_KEY_4!, hre.ethers.provider);

        // Ensure all addresses exist and are funded on the testnet
        const addresses = [
            organizer.address,
            evaluator1.address,
            evaluator2.address,
            contestant1.address,
            contestant2.address
        ];

        try {
            await ensureAddressesExist(addresses, organizer);
        } catch (error) {
            console.warn("Warning in ensureAddressesExist:", error.message);
        }
    });

    beforeEach(async () => {
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

        // Ensure all accounts have sufficient balance
        const accounts = [evaluator1, evaluator2, contestant1, contestant2];
        for (const account of accounts) {
            try {
                await transferTokensIfNeeded(organizer, account.address, minimumBalance);
            } catch (error) {
                console.warn(`Failed to transfer tokens to ${account.address}: ${error.message}`);
            }
        }
    });

    it("should complete a basic prize scenario", async function () {
        // Check if evaluators have sufficient balance before proceeding
        for (const evaluator of [evaluator1, evaluator2]) {
            const balance = await ethers.provider.getBalance(evaluator.address);
            if (balance < minimumBalance) {
                console.warn(`Evaluator ${evaluator.address} has insufficient balance. Skipping test.`);
                this.skip();
            }
        }

        console.log("Creating prize...");
        let tx;
        try {
            tx = await prizeManager.connect(organizer).createPrize(
                description,
                rewardPool,
                "AllocationStrategyLinear",
                criteriaNames,
                { value: rewardPool }
            );
        } catch (error) {
            console.error("Error creating prize:", error);
            if (error.message.includes("insufficient funds")) {
                console.warn("Organizer may not have enough balance. Skipping test.");
                this.skip();
            }
            throw error;
        }

        const receipt = await tx.wait(1); // Use wait(1) instead of wait()
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

        // Try to call a view function on the contract
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

        // Check if the organizer has the default admin role
        console.log("Organizer has DEFAULT_ADMIN_ROLE:", await prizeContract.hasRole(await prizeContract.DEFAULT_ADMIN_ROLE(), organizer.address));

        expect(await prizeContract.description()).to.equal(description);
        expect(await prizeContract.state()).to.equal(PrizeState.Setup);

        if (!evaluator1 || !evaluator2) {
            throw new Error("Evaluators are not properly initialized");
        }

        console.log("State after creation:", await prizeContract.state());
        console.log("Adding evaluators...");
        await prizeContract.connect(organizer).addEvaluators([evaluator1.address, evaluator2.address]);
        console.log("State after adding evaluators:", await prizeContract.state());

        console.log("Checking evaluator roles...");
        expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator1.address)).to.be.true;
        expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator2.address)).to.be.true;

        console.log("Moving to next state...");
        await prizeContract.connect(organizer).moveToNextState();
        console.log("State after moving to next state:", await prizeContract.state());

        expect(await prizeContract.state()).to.equal(PrizeState.Open);
        expect(await ethers.provider.getBalance(prizeAddress)).to.equal(rewardPool);

        console.log("Submitting contributions...");
        for (const [index, contestant] of [contestant1, contestant2].entries()) {
            try {
                let tx = await prizeContract.connect(contestant).submitContribution(`Contestant ${index + 1} FHE Innovation`);
                let receipt = await tx.wait(1); // Use wait(1) instead of wait()
                if (!receipt) {
                    throw new Error(`Failed to get receipt for contestant ${index + 1} submission`);
                }
                console.log(`Contestant ${index + 1} submission gas used:`, receipt.gasUsed.toString());

                // Get the fee data
                const feeData = await contestant.provider.getFeeData();
                if (!feeData.gasPrice) {
                    throw new Error("Unable to get gas price");
                }

                // Calculate the cost
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

            // Connect the contract to the correct evaluator before estimating gas or sending the transaction
            const connectedPrizeContract = prizeContract.connect(evaluator);

            const gasEstimate = await connectedPrizeContract.assignScores.estimateGas(
                [contestant1.address, contestant2.address],
                encryptedScores
            );
            console.log(`Estimated gas for assignScores: ${gasEstimate.toString()}`);

            // Replace the getGasPrice call with getFeeData
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

                const receipt = await tx.wait(1); // Use wait(1) instead of wait()
                console.log(`Transaction confirmed. Gas used: ${receipt.gasUsed.toString()}`);
                console.log(`Gas used type: ${typeof receipt.gasUsed}`);
                console.log(`Gas price: ${receipt.gasPrice.toString()}`);
                console.log(`Gas price type: ${typeof receipt.gasPrice}`);
                const transactionCost = receipt.gasUsed * receipt.gasPrice;
                console.log(`Actual transaction cost: ${ethers.formatEther(transactionCost)} ETH`);

                expect(findEventInReceipt(receipt, 'ScoresAssigned')).to.not.be.undefined;
            } catch (error) {
                console.error(`Error assigning scores for Evaluator ${i + 1}:`, error);
                throw error; // Re-throw the error to fail the test
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
            const receipt = await tx.wait(1); // Use wait(1) instead of wait()
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