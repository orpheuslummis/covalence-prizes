/*
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FheInstance, createFheInstance } from "../utils/instance";
import { IAllocationStrategyFHE, PrizeManager, StrategyRegistry, PrizeContractFHE } from "../types";
import { getTokensFromFaucet } from "./utils";
import { FhenixClient } from "fhenixjs";

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
  let fheInstance: FheInstance;
  let organizer: SignerWithAddress;
  let evaluator1: SignerWithAddress;
  let evaluator2: SignerWithAddress;
  let contestant1: SignerWithAddress;
  let contestant2: SignerWithAddress;
  let client: FhenixClient;
  let contractAddress: string;
  let permission: any;

  before(async function () {
    const signers = await hre.ethers.getSigners();
    [organizer, evaluator1, evaluator2, contestant1, contestant2] = signers;
    await getTokensFromFaucet(organizer.address);
    await getTokensFromFaucet(evaluator1.address);
    await getTokensFromFaucet(evaluator2.address);
    await getTokensFromFaucet(contestant1.address);
    await getTokensFromFaucet(contestant2.address);
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

    const LinearAllocationFHE = await hre.ethers.getContractFactory("LinearAllocationFHE");
    allocationStrategy = await LinearAllocationFHE.connect(contractOwner).deploy() as IAllocationStrategyFHE;
    await allocationStrategy.waitForDeployment();

    const strategyName = "LinearAllocationFHE";
    const strategyAddress = await allocationStrategy.getAddress();
    if (!strategyAddress) {
      throw new Error(`Failed to get address for strategy: ${strategyName}`);
    }
    await strategyRegistry.setStrategyAddress(strategyName, strategyAddress);

    fheInstance = await createFheInstance(hre, await prizeManager.getAddress());
    contractAddress = await prizeManager.getAddress();
    client = fheInstance.instance;
    permission = fheInstance.permission;
  });

  it.only("should simulate a complete prize lifecycle with FHE", async function () {
    const totalRewardPool = 1_000_000;
    console.log("Creating prize with total reward pool:", totalRewardPool);
    const tx = await prizeManager.connect(organizer).createPrize(
      "FHE Innovation Prize",
      totalRewardPool,
      "LinearAllocationFHE",
      ["Creativity", "Feasibility", "Impact"],
      [30, 30, 40]
    );
    const receipt = await tx.wait();
    const prizeAddress = receipt?.logs[0].address;
    console.log("Prize address:", prizeAddress);
    if (typeof prizeAddress !== 'string') {
      throw new Error('Failed to get prize address');
    }

    const prizeContract = await hre.ethers.getContractAt("PrizeContractFHE", prizeAddress) as PrizeContractFHE;

    console.log("Prize description:", await prizeContract.description());
    expect(await prizeContract.description()).to.equal("FHE Innovation Prize");
    console.log("Prize state: Created");
    expect(await prizeContract.state()).to.equal(PrizeState.Created);

    const fundTx = await prizeContract.connect(organizer).fundPrize({ value: totalRewardPool });
    const fundReceipt = await fundTx.wait();
    expect(fundReceipt?.status).to.equal(1); // 1 means success

    console.log("Adding evaluators:", evaluator1.address, evaluator2.address);
    await prizeContract.connect(organizer).addEvaluators([evaluator1.address, evaluator2.address]);
    expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator1.address)).to.be.true;
    expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator2.address)).to.be.true;

    console.log("Moving to next state, Open");
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Open);

    console.log("Submitting contributions");
    await prizeContract.connect(contestant1).submitContribution("Contestant 1 FHE Innovation");
    await prizeContract.connect(contestant2).submitContribution("Contestant 2 FHE Innovation");

    const contribution1 = await prizeContract.contributions(contestant1.address);
    const contribution2 = await prizeContract.contributions(contestant2.address);
    console.log("Contribution 1 description:", contribution1.description);
    expect(contribution1.description).to.equal("Contestant 1 FHE Innovation");
    console.log("Contribution 2 description:", contribution2.description);
    expect(contribution2.description).to.equal("Contestant 2 FHE Innovation");

    console.log("Moving to next state, Evaluating");
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

    console.log("Assigning scores for contestants");
    const evaluators = [evaluator1, evaluator2];
    const scores = [
      [
        [80, 70, 90],
        [75, 85, 80]
      ],
      [
        [85, 75, 88],
        [78, 82, 85]
      ]
    ];

    // wtf 
    for (let i = 0; i < evaluators.length; i++) {
      const evaluator = evaluators[i];
      const evaluatorScores = scores[i];
      const encryptedScores = await Promise.all(
        evaluatorScores.map(contestantScores =>
          Promise.all(contestantScores.map(score => client.encrypt_uint32(score)))
        )
      );
      await prizeContract.connect(evaluator).assignScores(
        [contestant1.address, contestant2.address],
        encryptedScores
      );
    }

    console.log("Moving to next state, Rewarding");
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);

    console.log("Computing scores and allocating rewards");
    await prizeContract.connect(organizer).computeScoresAndAllocateRewards(0, 2);

    for (const contestant of [contestant1, contestant2]) {
      const sealedTotalScore = await prizeContract.getEncryptedTotalScore(contestant.address, permission);
      console.log("Sealed total score for contestant:", contestant.address, sealedTotalScore);
      const decryptedTotalScore = await client.unseal(prizeAddress, sealedTotalScore);
      console.log("Decrypted total score for contestant:", contestant.address, decryptedTotalScore);
      expect(Number(decryptedTotalScore)).to.be.greaterThan(0);

      const sealedReward = await prizeContract.getEncryptedReward(contestant.address, permission);
      console.log("Sealed reward for contestant:", contestant.address, sealedReward);
      const decryptedReward = await client.unseal(prizeAddress, sealedReward);
      console.log("Decrypted reward for contestant:", contestant.address, decryptedReward);
      expect(Number(decryptedReward)).to.be.greaterThan(0);
    }

    console.log("Moving to next state");
    await prizeContract.connect(organizer).moveToNextState();
    console.log("Prize state:", await prizeContract.state());
    expect(await prizeContract.state()).to.equal(PrizeState.Closed);

    const contestant1BalanceBefore = await hre.ethers.provider.getBalance(contestant1.address);
    console.log("Contestant 1 balance before claiming reward:", contestant1BalanceBefore);
    await prizeContract.connect(contestant1).claimReward(permission);
    const contestant1BalanceAfter = await hre.ethers.provider.getBalance(contestant1.address);
    console.log("Contestant 1 balance after claiming reward:", contestant1BalanceAfter);
    expect(contestant1BalanceAfter).to.be.gt(contestant1BalanceBefore);

    const contestant2BalanceBefore = await hre.ethers.provider.getBalance(contestant2.address);
    console.log("Contestant 2 balance before claiming reward:", contestant2BalanceBefore);
    await prizeContract.connect(contestant2).claimReward(permission);
    const contestant2BalanceAfter = await hre.ethers.provider.getBalance(contestant2.address);
    console.log("Contestant 2 balance after claiming reward:", contestant2BalanceAfter);
    expect(contestant2BalanceAfter).to.be.gt(contestant2BalanceBefore);

    const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
    console.log("Contract balance after rewards claimed:", contractBalance);
    expect(contractBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));

    await expect(prizeContract.connect(contestant1).claimReward(permission)).to.be.revertedWith("Reward already claimed");
    await expect(prizeContract.connect(contestant2).claimReward(permission)).to.be.revertedWith("Reward already claimed");
  });

  it("should allow cancellation and encrypted fund withdrawal", async function () {
    const totalRewardPool = 500_000;

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

    await prizeContract.connect(organizer).fundPrize({ value: totalRewardPool });

    const sealedBalanceBeforeWithdrawal = await prizeContract.getEncryptedBalance(permission);
    const decryptedBalanceBeforeWithdrawal = await client.unseal(prizeAddress, sealedBalanceBeforeWithdrawal);
    expect(decryptedBalanceBeforeWithdrawal).to.equal(totalRewardPool);

    await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Open);

    await prizeContract.connect(contestant1).submitContribution("Contestant 1 FHE Entry");

    await prizeContract.connect(organizer).cancelPrize();
    expect(await prizeContract.state()).to.equal(PrizeState.Cancelled);

    await expect(prizeContract.connect(contestant1).submitContribution("Late FHE Entry"))
      .to.be.revertedWith("Invalid state");

    const organizerBalanceBefore = await hre.ethers.provider.getBalance(organizer.address);
    const withdrawTx = await prizeContract.connect(organizer).withdrawFunds(permission);
    await withdrawTx.wait();
    const organizerBalanceAfter = await hre.ethers.provider.getBalance(organizer.address);

    expect(organizerBalanceAfter).to.be.gt(organizerBalanceBefore);

    const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
    expect(contractBalance).to.equal(0);

    await expect(prizeContract.connect(organizer).withdrawFunds(permission))
      .to.be.revertedWith("No funds to withdraw");
  });

  it("should handle encrypted batch processing for score assignment and reward allocation", async function () {
    const contestantCount = 10;
    const contestants = await hre.ethers.getSigners();
    contestants.splice(0, 5); // Remove organizer and evaluators

    const totalRewardPool = 1_000_000;

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

    await prizeContract.connect(organizer).fundPrize({ value: totalRewardPool });

    await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Open);

    for (let i = 0; i < contestantCount; i++) {
      await prizeContract.connect(contestants[i]).submitContribution(`Contestant ${i + 1} FHE Entry`);
    }

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

    const batchSize = 5;
    for (let i = 0; i < contestantCount; i += batchSize) {
      const batchContestants = contestants.slice(i, i + batchSize);
      const batchScores = await Promise.all(batchContestants.map(async () => [
        await client.encrypt_uint32(80),
        await client.encrypt_uint32(75),
        await client.encrypt_uint32(85)
      ]));

      await prizeContract.connect(evaluator1).assignScores(
        batchContestants.map(c => c.address),
        batchScores
      );
    }

    for (let i = 0; i < contestantCount; i++) {
      const sealedTotalScore = await prizeContract.getEncryptedTotalScore(contestants[i].address, permission);
      const decryptedTotalScore = await client.unseal(prizeAddress, sealedTotalScore);
      expect(Number(decryptedTotalScore)).to.be.greaterThan(0);
    }

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);

    for (let i = 0; i < contestantCount; i += batchSize) {
      await prizeContract.connect(organizer).computeScoresAndAllocateRewards(i, batchSize);
    }

    await prizeContract.connect(organizer).moveToNextState();
    expect(await prizeContract.state()).to.equal(PrizeState.Closed);

    for (let i = 0; i < contestantCount; i++) {
      const contestantBalanceBefore = await hre.ethers.provider.getBalance(contestants[i].address);
      await prizeContract.connect(contestants[i]).claimReward(permission);
      const contestantBalanceAfter = await hre.ethers.provider.getBalance(contestants[i].address);
      expect(contestantBalanceAfter).to.be.gt(contestantBalanceBefore);
    }

    const contractBalance = await hre.ethers.provider.getBalance(prizeAddress);
    expect(contractBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));
  });

  it("should handle encrypted operations correctly", async function () {
    const totalRewardPool = 1_000_000;

    const tx = await prizeManager.connect(organizer).createPrize(
      "FHE Test Prize",
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

    await prizeContract.connect(organizer).fundPrize({ value: totalRewardPool });

    const sealedBalance = await prizeContract.getEncryptedBalance(permission);
    const decryptedBalance = await client.unseal(prizeAddress, sealedBalance);
    expect(decryptedBalance).to.equal(totalRewardPool);

    await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
    await prizeContract.connect(organizer).moveToNextState();

    await prizeContract.connect(contestant1).submitContribution("FHE Contribution");

    await prizeContract.connect(organizer).moveToNextState();

    const encryptedScore = await client.encrypt_uint32(85);
    await prizeContract.connect(evaluator1).assignScores(
      [contestant1.address],
      [[encryptedScore]]
    );

    const sealedTotalScore = await prizeContract.getEncryptedTotalScore(contestant1.address, permission);
    const decryptedTotalScore = await client.unseal(prizeAddress, sealedTotalScore);
    expect(Number(decryptedTotalScore)).to.equal(85);

    await prizeContract.connect(organizer).moveToNextState();
    await prizeContract.connect(organizer).computeScoresAndAllocateRewards(0, 1);

    const sealedReward = await prizeContract.getEncryptedReward(contestant1.address, permission);
    const decryptedReward = await client.unseal(prizeAddress, sealedReward);
    expect(Number(decryptedReward)).to.be.greaterThan(0);
    expect(Number(decryptedReward)).to.be.lessThanOrEqual(totalRewardPool);

    await prizeContract.connect(organizer).moveToNextState();

    const balanceBefore = await hre.ethers.provider.getBalance(contestant1.address);
    await prizeContract.connect(contestant1).claimReward(permission);
    const balanceAfter = await hre.ethers.provider.getBalance(contestant1.address);

    expect(balanceAfter).to.be.gt(balanceBefore);

    const remainingBalance = await hre.ethers.provider.getBalance(prizeAddress);
    expect(remainingBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));
  });

  it("should handle edge cases with encrypted values", async function () {
    const totalRewardPool = 1;

    const tx = await prizeManager.connect(organizer).createPrize(
      "Edge Case FHE Prize",
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

    await prizeContract.connect(organizer).fundPrize({ value: totalRewardPool });
    await prizeContract.connect(organizer).addEvaluators([evaluator1.address]);
    await prizeContract.connect(organizer).moveToNextState();
    await prizeContract.connect(contestant1).submitContribution("Edge Case Contribution");
    await prizeContract.connect(organizer).moveToNextState();

    const minScore = await client.encrypt_uint32(1);
    await prizeContract.connect(evaluator1).assignScores([contestant1.address], [[minScore]]);

    await prizeContract.connect(organizer).moveToNextState();
    await prizeContract.connect(organizer).computeScoresAndAllocateRewards(0, 1);

    const sealedReward = await prizeContract.getEncryptedReward(contestant1.address, permission);
    const decryptedReward = await client.unseal(prizeAddress, sealedReward);
    expect(Number(decryptedReward)).to.equal(1);

    await prizeContract.connect(organizer).moveToNextState();

    const balanceBefore = await hre.ethers.provider.getBalance(contestant1.address);
    await prizeContract.connect(contestant1).claimReward(permission);
    const balanceAfter = await hre.ethers.provider.getBalance(contestant1.address);

    expect(balanceAfter).to.be.gt(balanceBefore);

    const remainingBalance = await hre.ethers.provider.getBalance(prizeAddress);
    expect(remainingBalance).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));
  });
});
*/