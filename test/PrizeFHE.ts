import { expect } from "chai";
import hre from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FhenixClient, EncryptedUint32 } from "fhenixjs";
import { IAllocationStrategyFHE, PrizeManager, StrategyRegistry, PrizeContractFHE } from "../types";
import { getTokensFromFaucet } from "./utils";

enum PrizeState {
    Created,
    Open,
    Evaluating,
    Rewarding,
    Closed,
    Cancelled
}

describe("PrizeFHE", function () {
    let prizeManager: PrizeManager;
    let allocationStrategy: IAllocationStrategyFHE;
    let strategyRegistry: StrategyRegistry;
    let instance: FhenixClient;
    let organizer: SignerWithAddress;
    let evaluator1: SignerWithAddress;
    let evaluator2: SignerWithAddress;
    let contestant1: SignerWithAddress;
    let contestant2: SignerWithAddress;

    before(async function () {
        await getTokensFromFaucet();
        [organizer, evaluator1, evaluator2, contestant1, contestant2] = await hre.ethers.getSigners();
        instance = new FhenixClient({ provider: hre.ethers.provider });
    });

    beforeEach(async function () {
        const StrategyRegistry = await hre.ethers.getContractFactory("StrategyRegistry");
        strategyRegistry = await StrategyRegistry.connect(organizer).deploy();
        await strategyRegistry.waitForDeployment();
        const strategyRegistryAddress = await strategyRegistry.getAddress();

        const PrizeManager = await hre.ethers.getContractFactory("PrizeManager");
        prizeManager = await PrizeManager.connect(organizer).deploy(strategyRegistryAddress);
        await prizeManager.waitForDeployment();

        const LinearAllocationFHE = await hre.ethers.getContractFactory("LinearAllocationFHE");
        allocationStrategy = await LinearAllocationFHE.connect(organizer).deploy() as IAllocationStrategyFHE;
        await allocationStrategy.waitForDeployment();

        const strategyName = "LinearAllocationFHE";
        const strategyAddress = await allocationStrategy.getAddress();
        if (!strategyAddress) {
            throw new Error(`Failed to get address for strategy: ${strategyName}`);
        }
        await strategyRegistry.setStrategyAddress(strategyName, strategyAddress);
    });

    describe("Prize Lifecycle", function () {
        it("should simulate a complete prize lifecycle with FHE", async function () {
            const totalRewardPool = 10_000_000; // 10 FHE tokens
            const encryptedRewardPool = await instance.encrypt_uint32(totalRewardPool);

            const tx = await prizeManager.connect(organizer).createPrize(
                "FHE Innovation Prize",
                totalRewardPool,
                "LinearAllocationFHE",
                ["Creativity", "Feasibility", "Impact"],
                [30, 30, 40]
            );
            const receipt = await tx.wait();
            const prizeAddress = receipt?.logs[0].address;

            if (typeof prizeAddress !== 'string') {
                throw new Error('Failed to get prize address');
            }

            const prizeContract = await hre.ethers.getContractAt("PrizeContractFHE", prizeAddress) as PrizeContractFHE;

            expect(await prizeContract.description()).to.equal("FHE Innovation Prize");

            await prizeContract.connect(organizer).fundPrize(encryptedRewardPool);

            // Add evaluators
            await prizeContract.connect(organizer).addEvaluators([evaluator1.address, evaluator2.address]);
            expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator1.address)).to.be.true;
            expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator2.address)).to.be.true;

            await prizeContract.connect(organizer).moveToNextState();
            expect(await prizeContract.state()).to.equal(PrizeState.Open);

            // Submit contributions
            await prizeContract.connect(contestant1).submitContribution("Contestant 1 FHE Innovation");
            await prizeContract.connect(contestant2).submitContribution("Contestant 2 FHE Innovation");

            const contribution1 = await prizeContract.contributions(contestant1.address);
            const contribution2 = await prizeContract.contributions(contestant2.address);
            expect(contribution1.description).to.equal("Contestant 1 FHE Innovation");
            expect(contribution2.description).to.equal("Contestant 2 FHE Innovation");

            await prizeContract.connect(organizer).moveToNextState();
            expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

            // Assign encrypted scores
            const encryptedScores1: EncryptedUint32[] = [
                await instance.encrypt_uint32(80),
                await instance.encrypt_uint32(70),
                await instance.encrypt_uint32(90)
            ];
            const encryptedScores2: EncryptedUint32[] = [
                await instance.encrypt_uint32(75),
                await instance.encrypt_uint32(85),
                await instance.encrypt_uint32(80)
            ];

            await prizeContract.connect(evaluator1).assignScores(
                [contestant1.address, contestant2.address],
                [encryptedScores1, encryptedScores2]
            );

            await prizeContract.connect(organizer).moveToNextState();
            expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);

            // Compute and allocate rewards
            await prizeContract.connect(organizer).computeScoresAndAllocateRewards(0, 2);

            await prizeContract.connect(organizer).moveToNextState();
            expect(await prizeContract.state()).to.equal(PrizeState.Closed);

            // Claim rewards
            const contestant1BalanceBefore = await hre.ethers.provider.getBalance(contestant1.address);
            const contestant1Permission = await instance.generatePermit(prizeAddress, undefined, contestant1);
            await prizeContract.connect(contestant1).claimReward(contestant1Permission);
            const contestant1BalanceAfter = await hre.ethers.provider.getBalance(contestant1.address);
            expect(contestant1BalanceAfter).to.be.gt(contestant1BalanceBefore);

            const contestant2BalanceBefore = await hre.ethers.provider.getBalance(contestant2.address);
            const contestant2Permission = await instance.generatePermit(prizeAddress, undefined, contestant2);
            await prizeContract.connect(contestant2).claimReward(contestant2Permission);
            const contestant2BalanceAfter = await hre.ethers.provider.getBalance(contestant2.address);
            expect(contestant2BalanceAfter).to.be.gt(contestant2BalanceBefore);

            // Verify contract balance is close to zero
            const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
            expect(contractBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));

            // Verify rewards can't be claimed twice
            await expect(prizeContract.connect(contestant1).claimReward(contestant1Permission)).to.be.revertedWith("Reward already claimed");
            await expect(prizeContract.connect(contestant2).claimReward(contestant2Permission)).to.be.revertedWith("Reward already claimed");
        });
    });

    it("should allow cancellation and encrypted fund withdrawal", async function () {
        const totalRewardPool = 5_000_000; // 5 FHE tokens
        const encryptedRewardPool = await instance.encrypt_uint32(totalRewardPool);

        const tx = await prizeManager.connect(organizer).createPrize(
            "Cancellable FHE Prize",
            totalRewardPool,
            "LinearAllocationFHE",
            ["Quality"],
            [100]
        );
        const receipt = await tx.wait();
        const prizeAddress = receipt?.logs[0].address;

        if (typeof prizeAddress !== 'string') {
            throw new Error('Failed to get prize address');
        }

        const prizeContract = await hre.ethers.getContractAt("PrizeContractFHE", prizeAddress) as PrizeContractFHE;

        await prizeContract.connect(organizer).fundPrize(encryptedRewardPool);

        await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Open);

        await prizeContract.connect(contestant1).submitContribution("Contestant 1 FHE Entry");

        await prizeContract.connect(organizer).cancelPrize();
        expect(await prizeContract.state()).to.equal(PrizeState.Cancelled);

        // Attempt to submit a contribution after cancellation (should fail)
        await expect(prizeContract.connect(contestant1).submitContribution("Late FHE Entry"))
            .to.be.revertedWith("Invalid state");

        // Withdraw funds
        const organizerBalanceBefore = await hre.ethers.provider.getBalance(organizer.address);
        const organizerPermission = await instance.generatePermit(prizeAddress, undefined, organizer);
        const withdrawTx = await prizeContract.connect(organizer).withdrawFunds(organizerPermission);
        await withdrawTx.wait();
        const organizerBalanceAfter = await hre.ethers.provider.getBalance(organizer.address);

        // Check that the organizer received the funds (minus gas costs)
        expect(organizerBalanceAfter).to.be.gt(organizerBalanceBefore);

        // Verify contract balance is zero after withdrawal
        const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
        expect(contractBalance).to.equal(0);

        // Attempt to withdraw again (should fail)
        await expect(prizeContract.connect(organizer).withdrawFunds(organizerPermission))
            .to.be.revertedWith("No funds to withdraw");
    });

    it("should handle encrypted batch processing for score assignment and reward allocation", async function () {
        const contestantCount = 10;
        const contestants = await hre.ethers.getSigners();
        contestants.splice(0, 5); // Remove organizer and evaluators

        const totalRewardPool = 10_000_000; // 10 FHE tokens
        const encryptedRewardPool = await instance.encrypt_uint32(totalRewardPool);

        const tx = await prizeManager.connect(organizer).createPrize(
            "Batch Processing FHE Prize",
            totalRewardPool,
            "LinearAllocationFHE",
            ["Quality", "Innovation", "Feasibility"],
            [40, 30, 30]
        );
        const receipt = await tx.wait();
        const prizeAddress = receipt?.logs[0].address;

        if (typeof prizeAddress !== 'string') {
            throw new Error('Failed to get prize address');
        }

        const prizeContract = await hre.ethers.getContractAt("PrizeContractFHE", prizeAddress) as PrizeContractFHE;

        await prizeContract.connect(organizer).fundPrize(encryptedRewardPool);

        await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Open);

        for (let i = 0; i < contestantCount; i++) {
            await prizeContract.connect(contestants[i]).submitContribution(`Contestant ${i + 1} FHE Entry`);
        }

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

        // Assign scores in batches
        const batchSize = 5;
        for (let i = 0; i < contestantCount; i += batchSize) {
            const batchContestants = contestants.slice(i, i + batchSize);
            const batchScores: EncryptedUint32[][] = await Promise.all(batchContestants.map(async () => [
                await instance.encrypt_uint32(80),
                await instance.encrypt_uint32(75),
                await instance.encrypt_uint32(85)
            ]));

            await prizeContract.connect(evaluator1).assignScores(
                batchContestants.map(c => c.address),
                batchScores
            );
        }

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);

        // Compute and allocate rewards in batches
        for (let i = 0; i < contestantCount; i += batchSize) {
            await prizeContract.connect(organizer).computeScoresAndAllocateRewards(i, batchSize);
        }

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Closed);

        // Claim rewards for all contestants and verify balances changed
        for (let i = 0; i < contestantCount; i++) {
            const contestantBalanceBefore = await hre.ethers.provider.getBalance(contestants[i].address);
            const contestantPermission = await instance.generatePermit(prizeAddress, undefined, contestants[i]);
            await prizeContract.connect(contestants[i]).claimReward(contestantPermission);
            const contestantBalanceAfter = await hre.ethers.provider.getBalance(contestants[i].address);
            expect(contestantBalanceAfter).to.be.gt(contestantBalanceBefore);
        }

        // Verify contract balance is close to zero after all claims
        const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
        expect(contractBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));
    });
});