// Prize.ts
import { expect } from "chai";
import hre from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FheInstance, createFheInstance } from "../utils/instance";
import { IAllocationStrategy, PrizeManager, StrategyRegistry } from "../types";
import { getTokensFromFaucet } from "./utils";

const PRIZE_AMOUNT = hre.ethers.parseEther("0.1");

enum PrizeState {
  Created,
  Open,
  Evaluating,
  Rewarding,
  Closed,
  Cancelled
}

describe("Prize", function () {
  let prizeManager: PrizeManager;
  let allocationStrategy: IAllocationStrategy;
  let strategyRegistry: StrategyRegistry;
  let instance: FheInstance;
  let organizer: SignerWithAddress;
  before(async function () {
    const signers = await hre.ethers.getSigners();
    for (const signer of signers) {
      await getTokensFromFaucet(signer.address);
    }
    organizer = signers[0];
  });

  beforeEach(async function () {
    const accounts = await hre.ethers.getSigners();
    const contractOwner = accounts[0];

    const StrategyRegistry = await hre.ethers.getContractFactory("StrategyRegistry");
    strategyRegistry = await StrategyRegistry.connect(contractOwner).deploy();
    await strategyRegistry.waitForDeployment();
    const strategyRegistryAddress = await strategyRegistry.getAddress();

    const PrizeManager = await hre.ethers.getContractFactory("PrizeManager");
    prizeManager = await PrizeManager.connect(contractOwner).deploy(strategyRegistryAddress);
    await prizeManager.waitForDeployment();

    const LinearAllocation = await hre.ethers.getContractFactory("LinearAllocation");
    allocationStrategy = await LinearAllocation.connect(contractOwner).deploy() as IAllocationStrategy;
    await allocationStrategy.waitForDeployment();

    const strategyName = "LinearAllocation";
    const strategyAddress = await allocationStrategy.getAddress();
    if (!strategyAddress) {
      throw new Error(`Failed to get address for strategy: ${strategyName}`);
    }
    await strategyRegistry.setStrategyAddress(strategyName, strategyAddress);

    instance = await createFheInstance(hre, await prizeManager.getAddress());
  });

  it("should simulate a complete prize lifecycle", async function () {
    const [organizer, evaluator1, evaluator2, contestant1, contestant2] = await hre.ethers.getSigners();

    const tx = await prizeManager.connect(organizer).createPrize(
      "Best Innovation Prize",
      PRIZE_AMOUNT,
      "LinearAllocation",
      ["Creativity", "Feasibility", "Impact"],
      [30, 30, 40]
    );
    const receipt = await tx.wait();
    const prizeAddress = receipt?.logs[0].address;

    if (typeof prizeAddress !== 'string') {
      throw new Error('Failed to get prize address');
    }

    const prizeContract = await hre.ethers.getContractAt("PrizeContract", prizeAddress);

    expect(await prizeContract.description()).to.equal("Best Innovation Prize");
    expect(await prizeContract.monetaryRewardPool()).to.equal(PRIZE_AMOUNT);
    expect(await prizeContract.strategy()).to.equal(await allocationStrategy.getAddress());

    await prizeContract.connect(organizer).fundPrize({ value: PRIZE_AMOUNT, gasLimit: 1000000 });

    // Add evaluators
    await prizeContract.connect(organizer).addEvaluators([evaluator1.address, evaluator2.address]);
    expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator1.address)).to.be.true;
    expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator2.address)).to.be.true;

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Open);

    // Submit contributions
    await prizeContract.connect(contestant1).submitContribution("Contestant 1 Innovation");
    await prizeContract.connect(contestant2).submitContribution("Contestant 2 Innovation");

    const contribution1 = await prizeContract.contributions(contestant1.address);
    const contribution2 = await prizeContract.contributions(contestant2.address);
    expect(contribution1.description).to.equal("Contestant 1 Innovation");
    expect(contribution2.description).to.equal("Contestant 2 Innovation");

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

    await prizeContract.connect(evaluator1).assignScores(
      [contestant1.address, contestant2.address],
      [[80, 70, 90], [75, 85, 80]]
    );
    await prizeContract.connect(evaluator2).assignScores(
      [contestant1.address, contestant2.address],
      [[85, 75, 95], [70, 80, 85]]
    );
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);

    // Add this line to compute and allocate rewards
    await prizeContract.connect(organizer).computeScoresAndAllocateRewards(0, 2);

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Closed);

    const contestant1BalanceBefore = await hre.ethers.provider.getBalance(contestant1.address);
    await prizeContract.connect(contestant1).claimReward();
    const contestant1BalanceAfter = await hre.ethers.provider.getBalance(contestant1.address);
    expect(contestant1BalanceAfter).to.be.gt(contestant1BalanceBefore);

    const contestant2BalanceBefore = await hre.ethers.provider.getBalance(contestant2.address);
    await prizeContract.connect(contestant2).claimReward();
    const contestant2BalanceAfter = await hre.ethers.provider.getBalance(contestant2.address);
    expect(contestant2BalanceAfter).to.be.gt(contestant2BalanceBefore);

    // Verify contract balance is close to zero
    const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
    expect(contractBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));

    // Verify rewards can't be claimed twice
    await expect(prizeContract.connect(contestant1).claimReward()).to.be.revertedWith("Reward already claimed");
    await expect(prizeContract.connect(contestant2).claimReward()).to.be.revertedWith("Reward already claimed");
  });

  it("should allow cancellation and fund withdrawal", async function () {
    const [organizer, evaluator1, contestant1] = await hre.ethers.getSigners();

    const halfPrizeAmount = PRIZE_AMOUNT / 2n; // Using BigInt division

    const tx = await prizeManager.connect(organizer).createPrize(
      "Cancellable Prize",
      halfPrizeAmount, // Using half of the prize amount for this test
      "LinearAllocation",
      ["Quality"],
      [100]
    );
    const receipt = await tx.wait();
    const prizeAddress = receipt?.logs[0].address;

    if (typeof prizeAddress !== 'string') {
      throw new Error('Failed to get prize address');
    }

    const prizeContract = await hre.ethers.getContractAt("PrizeContract", prizeAddress);

    await prizeContract.connect(organizer).fundPrize({ value: halfPrizeAmount, gasLimit: 1000000 });

    await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Open);

    await prizeContract.connect(contestant1).submitContribution("Contestant 1 Entry");

    await prizeContract.connect(organizer).cancelPrize();
    expect(await prizeContract.state()).to.equal(PrizeState.Cancelled);

    // Attempt to submit a contribution after cancellation (should fail)
    await expect(prizeContract.connect(contestant1).submitContribution("Late Entry"))
      .to.be.revertedWith("Invalid state");

    // Withdraw funds
    const organizerBalanceBefore = await hre.ethers.provider.getBalance(organizer.address);
    const withdrawTx = await prizeContract.connect(organizer).withdrawFunds();
    await withdrawTx.wait();
    const organizerBalanceAfter = await hre.ethers.provider.getBalance(organizer.address);

    // Check that the organizer received the funds (minus gas costs)
    expect(organizerBalanceAfter).to.be.gt(organizerBalanceBefore);

    // Verify contract balance is zero after withdrawal
    const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
    expect(contractBalance).to.equal(0);

    // Attempt to withdraw again (should fail)
    await expect(prizeContract.connect(organizer).withdrawFunds())
      .to.be.revertedWith("No funds to withdraw");
  });

  it("should not allow reward allocation if not all contestants are scored", async function () {
    const [organizer, evaluator1, contestant1, contestant2, contestant3] = await hre.ethers.getSigners();

    const tx = await prizeManager.connect(organizer).createPrize(
      "Partial Scoring Test Prize",
      PRIZE_AMOUNT,
      "LinearAllocation",
      ["Quality", "Innovation"],
      [50, 50]
    );
    const receipt = await tx.wait();
    const prizeAddress = receipt?.logs[0].address;

    if (typeof prizeAddress !== 'string') {
      throw new Error('Failed to get prize address');
    }

    const prizeContract = await hre.ethers.getContractAt("PrizeContract", prizeAddress);

    // Fund the prize
    await prizeContract.connect(organizer).fundPrize({ value: PRIZE_AMOUNT, gasLimit: 1000000 });

    await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Open);

    await prizeContract.connect(contestant1).submitContribution("Contestant 1 Entry");
    await prizeContract.connect(contestant2).submitContribution("Contestant 2 Entry");
    await prizeContract.connect(contestant3).submitContribution("Contestant 3 Entry");

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

    // Assign scores for only two contestants
    await prizeContract.connect(evaluator1).assignScores(
      [contestant1.address, contestant2.address],
      [[80, 70], [75, 85]]
    );

    // Attempt to move to Rewarding state (should fail)
    await expect(prizeContract.connect(organizer).moveToNextState())
      .to.be.revertedWith("All contestants must be scored before moving to Rewarding");

    // Assign scores for the remaining contestant
    await prizeContract.connect(evaluator1).assignScores(
      [contestant3.address],
      [[90, 95]]
    );

    // Now moving to Rewarding state should succeed
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);

    await prizeContract.connect(organizer).computeScoresAndAllocateRewards(0, 3);

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Closed);

    // Verify all contestants have non-zero rewards
    const contribution1 = await prizeContract.contributions(contestant1.address);
    const contribution2 = await prizeContract.contributions(contestant2.address);
    const contribution3 = await prizeContract.contributions(contestant3.address);

    expect(contribution1.reward).to.be.gt(0);
    expect(contribution2.reward).to.be.gt(0);
    expect(contribution3.reward).to.be.gt(0);
  });

  it("should handle batch processing for score assignment and reward allocation", async function () {
    const [organizer, evaluator1, ...contestants] = await hre.ethers.getSigners();
    const contestantCount = 10;

    const tx = await prizeManager.connect(organizer).createPrize(
      "Batch Processing Prize",
      PRIZE_AMOUNT,
      "LinearAllocation",
      ["Quality", "Innovation", "Feasibility"],
      [40, 30, 30]
    );
    const receipt = await tx.wait();
    const prizeAddress = receipt?.logs[0].address;

    if (typeof prizeAddress !== 'string') {
      throw new Error('Failed to get prize address');
    }

    const prizeContract = await hre.ethers.getContractAt("PrizeContract", prizeAddress);

    await prizeContract.connect(organizer).fundPrize({ value: PRIZE_AMOUNT, gasLimit: 1000000 });

    await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Open);

    for (let i = 0; i < contestantCount; i++) {
      await prizeContract.connect(contestants[i]).submitContribution(`Contestant ${i + 1} Entry`);
    }

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

    // Assign scores in batches
    const batchSize = 5;
    for (let i = 0; i < contestantCount; i += batchSize) {
      const batchContestants = contestants.slice(i, i + batchSize);
      const batchScores = batchContestants.map(() => [80, 75, 85]);

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

    // Check contract balance before claiming rewards
    const contractBalanceBeforeClaims = await hre.ethers.provider.getBalance(prizeAddress);
    // console.log(`Contract balance before claims: ${hre.ethers.formatEther(contractBalanceBeforeClaims)} ETH`);

    // Calculate total rewards allocated
    let totalRewardsAllocated = hre.ethers.parseEther("0");
    for (let i = 0; i < contestantCount; i++) {
      const contribution = await prizeContract.contributions(contestants[i].address);
      totalRewardsAllocated = totalRewardsAllocated + contribution.reward;
    }
    // console.log(`Total rewards allocated: ${hre.ethers.formatEther(totalRewardsAllocated)} ETH`);

    expect(contractBalanceBeforeClaims).to.be.gte(totalRewardsAllocated, "Contract balance insufficient for all rewards");

    // Claim rewards for all contestants and verify balances changed
    for (let i = 0; i < contestantCount; i++) {
      const contestantBalanceBefore = await hre.ethers.provider.getBalance(contestants[i].address);
      try {
        await prizeContract.connect(contestants[i]).claimReward({ gasLimit: 1000000 });
        const contestantBalanceAfter = await hre.ethers.provider.getBalance(contestants[i].address);
        expect(contestantBalanceAfter).to.be.gt(contestantBalanceBefore);
      } catch (error) {
        console.error(`Error claiming reward for contestant ${i}:`, error);
        throw error;
      }
    }

    // Verify contract balance is close to zero after all claims
    const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
    expect(contractBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));
  });
});