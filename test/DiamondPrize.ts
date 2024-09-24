import { expect } from "chai";
import { Signer, TransactionResponse } from "ethers";
import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createFheInstance } from "../utils/instance";
import {
  connectDiamond,
  DiamondWithFacets,
  extractPrizeIdFromTx,
  generateRandomPrizeParams,
  logTransaction,
  PrizeParams,
} from "./utils";

// Define or import the generateUniqueId function
function generateUniqueId(): string {
  return ethers.hexlify(ethers.randomBytes(4)).replace(/^0x/, "");
}

describe("Diamond Prize Comprehensive Tests", function () {
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;
  let addr3: Signer;
  let hre: HardhatRuntimeEnvironment;
  let d: DiamondWithFacets;
  let ownerFheClient: any; // Replace `any` with the correct type
  let addr1FheClient: any;
  let addr2FheClient: any;
  let prizeId: bigint;
  let uniqueId: string;
  let addr1Diamond: DiamondWithFacets;
  let addr2Diamond: DiamondWithFacets;
  let addr3Diamond: DiamondWithFacets;
  let chainId: string;
  let network: any;
  let ownerDiamond: DiamondWithFacets;
  let prizeParams: PrizeParams;

  /**
   * Global Fixture to deploy and set up the Diamond contract
   */
  before(async function () {
    hre = await import("hardhat");
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    console.log("owner:", await owner.getAddress());
    console.log("addr1:", await addr1.getAddress());
    console.log("addr2:", await addr2.getAddress());
    console.log("addr3:", await addr3.getAddress());

    network = await ethers.provider.getNetwork();
    chainId = network.chainId.toString();
    d = await connectDiamond(owner);
    console.log("Diamond address:", await d.getAddress());

    ownerFheClient = await createFheInstance(hre, await d.getAddress(), owner);
    addr1FheClient = await createFheInstance(hre, await d.getAddress(), addr1);
    addr2FheClient = await createFheInstance(hre, await d.getAddress(), addr2);

    ownerDiamond = await connectDiamond(owner);
    addr1Diamond = await connectDiamond(addr1);
    addr2Diamond = await connectDiamond(addr2);
    addr3Diamond = await connectDiamond(addr3);
  });

  /**
   * Shared Fixture for Each Test
   * Sets up a new prize before each test to ensure isolation
   */
  beforeEach(async function () {
    uniqueId = generateUniqueId();
    prizeParams = generateRandomPrizeParams(uniqueId);

    // Create Prize
    const createTx: TransactionResponse = await ownerDiamond.createPrize(prizeParams);
    prizeId = await extractPrizeIdFromTx(ownerDiamond, createTx);
    await logTransaction(ownerDiamond, createTx, "Create Prize");

    // Check state after creation
    let state = await ownerDiamond.getState(prizeId);
    console.log(`State after creation: ${state}`);

    // Fund Prize if required by state
    if (prizeParams.pool > 0) {
      const fundTx: TransactionResponse = await ownerDiamond.fundTotally(prizeId, { value: prizeParams.pool });
      await logTransaction(ownerDiamond, fundTx, "Fund Prize");
    }

    // Check state after funding
    state = await ownerDiamond.getState(prizeId);
    console.log(`State after funding: ${state}`);

    // Move to Open State if required
    if (prizeParams.pool > 0) {
      const moveTx: TransactionResponse = await ownerDiamond.moveToNextState(prizeId);
      await logTransaction(ownerDiamond, moveTx, "Move to Open State");
    }

    // Check state after moving to Open
    state = await ownerDiamond.getState(prizeId);
    console.log(`State after moving to Open: ${state}`);

    // Add Evaluators
    if (prizeParams.criteria.length > 0) {
      const evaluators = [await addr1.getAddress(), await addr2.getAddress()];
      console.log(`Attempting to add evaluators: ${evaluators.join(", ")}`);
      try {
        const addEvalTx: TransactionResponse = await ownerDiamond.addEvaluators(prizeId, evaluators);
        await logTransaction(ownerDiamond, addEvalTx, "Add Evaluators");
      } catch (error) {
        console.error("Error adding evaluators:", error);
        throw error;
      }
    }

    // Check final state
    state = await ownerDiamond.getState(prizeId);
    console.log(`Final state: ${state}`);
  });

  /**
   * Prize Creation and Management Tests
   */
  describe("Prize Creation and Management", function () {
    it("Should create a prize successfully", async function () {
      const prizeDetails = await ownerDiamond.getPrizeDetails(prizeId);
      expect(prizeDetails.id).to.equal(prizeId);
      expect(prizeDetails.organizer).to.equal(await owner.getAddress());
      expect(prizeDetails.name).to.equal(prizeParams.name);
      expect(prizeDetails.description).to.equal(prizeParams.description);
      expect(prizeDetails.monetaryRewardPool).to.equal(prizeParams.pool);
      expect(prizeDetails.state).to.equal(0); // Assuming 0 corresponds to Setup
      expect(prizeDetails.criteriaNames).to.deep.equal(prizeParams.criteria);
      expect(prizeDetails.criteriaWeights).to.deep.equal(prizeParams.criteriaWeights);
      expect(prizeDetails.strategy).to.equal(prizeParams.strategy);
      expect(prizeDetails.contributionCount).to.equal(0);
      expect(prizeDetails.evaluatedContributionsCount).to.equal(0);
      expect(prizeDetails.claimedRewardsCount).to.equal(0);
      expect(prizeDetails.rewardsAllocated).to.be.false;
    });
  });

  /**
   * Evaluators Management Tests
   */
  describe("Evaluators Management", function () {
    beforeEach(async function () {
      // Add Evaluators if not already added in the shared fixture
      const evaluators = [await addr1.getAddress(), await addr2.getAddress()];
      const addEvalTx: TransactionResponse = await ownerDiamond.addEvaluators(prizeId, evaluators);
      await logTransaction(ownerDiamond, addEvalTx, "Add Evaluators");
    });

    it("Should add evaluators correctly", async function () {
      const retrievedEvaluators = await ownerDiamond.getPrizeEvaluators(prizeId);
      const evaluatorAddresses = [await addr1.getAddress(), await addr2.getAddress()];
      expect(retrievedEvaluators).to.have.members(evaluatorAddresses);
    });

    it("Should remove evaluators correctly", async function () {
      const evaluatorsToRemove = [await addr1.getAddress()];
      const removeEvalTx: TransactionResponse = await ownerDiamond.removeEvaluators(prizeId, evaluatorsToRemove);
      await logTransaction(ownerDiamond, removeEvalTx, "Remove Evaluators");

      const retrievedEvaluators = await ownerDiamond.getPrizeEvaluators(prizeId);
      const remainingEvaluator = [await addr2.getAddress()];
      expect(retrievedEvaluators).to.have.members(remainingEvaluator);
    });

    it("Non-organizer should not add evaluators", async function () {
      const newEvaluator = await addr3.getAddress();
      await expect(addr3Diamond.addEvaluators(prizeId, [newEvaluator])).to.be.revertedWith(
        "Only prize organizer can perform this action",
      );
    });
  });

  /**
   * State Transitions Tests
   */
  describe("State Transitions", function () {
    it("Should move from Setup to Open after funding and setting strategy", async function () {
      // Ensure prize is funded already in beforeEach if pool > 0
      const moveTx: TransactionResponse = await ownerDiamond.moveToNextState(prizeId);
      await logTransaction(ownerDiamond, moveTx, "Move to Open State");

      const prizeDetails = await ownerDiamond.getPrizeDetails(prizeId);
      expect(prizeDetails.state).to.equal(1); // Assuming 1 corresponds to Open
    });

    it("Should revert transition to Open if Prize not funded", async function () {
      // Create a new prize without funding
      const unfundedPrizeParams = generateRandomPrizeParams("unfunded");
      const createTx: TransactionResponse = await ownerDiamond.createPrize(unfundedPrizeParams);
      const unfundedPrizeId = await extractPrizeIdFromTx(ownerDiamond, createTx);
      await logTransaction(ownerDiamond, createTx, "Create Unfunded Prize");

      // Attempt to move to Open State
      await expect(ownerDiamond.moveToNextState(unfundedPrizeId)).to.be.revertedWith(
        "Prize pool must be funded before opening",
      );
    });

    it("Should revert if trying to move to next state from Closed", async function () {
      // Move through all states to reach Closed
      await ownerDiamond.moveToNextState(prizeId); // Setup -> Open
      await ownerDiamond.moveToNextState(prizeId); // Open -> Evaluating
      await ownerDiamond.moveToNextState(prizeId); // Evaluating -> Allocating
      await ownerDiamond.moveToNextState(prizeId); // Allocating -> Claiming
      await ownerDiamond.moveToNextState(prizeId); // Claiming -> Closed

      // Attempt to move from Closed
      await expect(ownerDiamond.moveToNextState(prizeId)).to.be.revertedWith("Cannot move to next state");
    });
  });

  /**
   * Reward Allocation and Claiming Tests
   */
  describe("Reward Allocation and Claiming", function () {
    beforeEach(async function () {
      // Move to Evaluating State
      await ownerDiamond.moveToNextState(prizeId); // Setup -> Open
      await ownerDiamond.moveToNextState(prizeId); // Open -> Evaluating

      // Submit Contributions
      const submitTx1: TransactionResponse = await addr1Diamond.submitContribution(
        prizeId,
        `Contribution from addr1 ${uniqueId}`,
      );
      await logTransaction(addr1Diamond, submitTx1, "Submit Contribution from addr1");

      const submitTx2: TransactionResponse = await addr2Diamond.submitContribution(
        prizeId,
        `Contribution from addr2 ${uniqueId}`,
      );
      await logTransaction(addr2Diamond, submitTx2, "Submit Contribution from addr2");

      // Evaluate Contributions
      const encryptedScore1 = await addr1FheClient.encrypt_uint32(80);
      const evaluateTx1: TransactionResponse = await addr1Diamond.evaluateContribution(prizeId, 0, [encryptedScore1]);
      await logTransaction(addr1Diamond, evaluateTx1, "Evaluate Contribution by addr1");

      const encryptedScore2 = await addr2FheClient.encrypt_uint32(90);
      const evaluateTx2: TransactionResponse = await addr2Diamond.evaluateContribution(prizeId, 1, [encryptedScore2]);
      await logTransaction(addr2Diamond, evaluateTx2, "Evaluate Contribution by addr2");

      // Move to Allocating State
      await ownerDiamond.moveToNextState(prizeId); // Evaluating -> Allocating
    });

    it("Should allocate rewards in batches correctly", async function () {
      const batchSize = 2;
      const allocateTx: TransactionResponse = await ownerDiamond.allocateRewardsBatch(prizeId, batchSize);
      await logTransaction(ownerDiamond, allocateTx, "Allocate Rewards Batch 1");

      // Check if all rewards are allocated
      const allRewardsAllocated = await ownerDiamond.areAllRewardsClaimed(prizeId);
      expect(allRewardsAllocated).to.be.true;

      // Verify that rewards can be viewed
      const permission = { publicKey: "0xpublicKeyExample", signature: "0xsignatureExample" };
      const rewardAddr1 = await addr1Diamond.viewContestantClaimReward(prizeId, permission);
      expect(rewardAddr1).to.be.a("string"); // The result is an encrypted string

      const rewardAddr2 = await addr2Diamond.viewContestantClaimReward(prizeId, permission);
      expect(rewardAddr2).to.be.a("string");
    });

    it("Should not allocate more rewards than available", async function () {
      const batchSize = 3; // Only 2 rewards available
      await expect(ownerDiamond.allocateRewardsBatch(prizeId, batchSize)).to.be.revertedWith(
        "Batch size exceeds available rewards",
      );
    });
  });

  /**
   * Access Control Tests
   */
  describe("Access Control Tests", function () {
    it("Should restrict prize creation to organizers", async function () {
      // Attempt to create prize with non-organizer (addr1)
      const nonOrganizerPrizeParams = generateRandomPrizeParams("nonOrganizer");
      await expect(addr1Diamond.createPrize(nonOrganizerPrizeParams)).to.be.revertedWith(
        "Only prize organizer can perform this action",
      );
    });

    it("Should restrict state transitions to organizers", async function () {
      // Attempt to move state using non-organizer
      await expect(addr1Diamond.moveToNextState(prizeId)).to.be.revertedWith("Caller is not the prize organizer");
    });
  });

  /**
   * Edge Case Tests
   */
  describe("Edge Case Tests", function () {
    it("Should prevent duplicate contributions from the same contestant", async function () {
      // Submit first contribution
      const submitTx1: TransactionResponse = await addr1Diamond.submitContribution(
        prizeId,
        `First contribution from addr1 ${uniqueId}`,
      );
      await logTransaction(addr1Diamond, submitTx1, "Submit First Contribution from addr1");

      // Attempt to submit duplicate contribution
      await expect(
        addr1Diamond.submitContribution(prizeId, `Duplicate contribution from addr1 ${uniqueId}`),
      ).to.be.revertedWith("Duplicate contribution not allowed");
    });

    it("Should not allow allocating rewards before all evaluations are done", async function () {
      // Create and set up a new prize
      const partialPrizeParams = generateRandomPrizeParams("partial");
      const createTx: TransactionResponse = await ownerDiamond.createPrize(partialPrizeParams);
      const partialPrizeId = await extractPrizeIdFromTx(ownerDiamond, createTx);
      await logTransaction(ownerDiamond, createTx, "Create Partial Prize");

      // Fund the prize
      const fundTx: TransactionResponse = await ownerDiamond.fundTotally(partialPrizeId, {
        value: partialPrizeParams.pool,
      });
      await logTransaction(ownerDiamond, fundTx, "Fund Partial Prize");

      // Move to Open State
      const moveOpenTx: TransactionResponse = await ownerDiamond.moveToNextState(partialPrizeId);
      await logTransaction(ownerDiamond, moveOpenTx, "Move to Open State (Partial Prize)");

      // Submit a single contribution
      const submitTx: TransactionResponse = await addr1Diamond.submitContribution(
        partialPrizeId,
        `Contribution from addr1 ${uniqueId}`,
      );
      await logTransaction(addr1Diamond, submitTx, "Submit Contribution from addr1 (Partial Prize)");

      // Move to Evaluating State
      const moveEvalTx: TransactionResponse = await ownerDiamond.moveToNextState(partialPrizeId);
      await logTransaction(ownerDiamond, moveEvalTx, "Move to Evaluating State (Partial Prize)");

      // Evaluate the contribution
      const encryptedScore = await addr1FheClient.encrypt_uint32(75);
      const evaluateTx: TransactionResponse = await addr1Diamond.evaluateContribution(partialPrizeId, 0, [
        encryptedScore,
      ]);
      await logTransaction(addr1Diamond, evaluateTx, "Evaluate Contribution by addr1 (Partial Prize)");

      // Attempt to allocate rewards without all evaluations
      await expect(ownerDiamond.allocateRewardsBatch(partialPrizeId, 1)).to.be.revertedWith(
        "Not all contributions evaluated",
      );
    });
  });
});
