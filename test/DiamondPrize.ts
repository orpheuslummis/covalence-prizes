// These tests assume the diamond already has been deployed. We run these tests on testnet.
// We use a single deployed diamond and do not reset its state completely.
// Each created element (prize, contribution) should use a unique ID to ensure test isolation.

import { expect } from "chai";
import { Network, Signer } from "ethers";
import { EncryptionTypes, FhenixClient } from "fhenixjs";
import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createFheInstance } from "../utils/instance";
import {
    connectDiamond,
    DiamondWithFacets,
    extractPrizeIdFromTx,
    generateRandomPrizeParams,
    generateUniqueId,
    getFacetName,
    logTransaction,
    PrizeParams,
    PrizeState
} from "./utils";

declare const hre: HardhatRuntimeEnvironment;

const MAX_UINT32 = BigInt(2 ** 32 - 1);
const PRECISION_FACTOR = BigInt(10 ** 6);

describe("Diamond Prize", function () {
    let owner: Signer;
    let addr1: Signer;
    let addr2: Signer;
    let d: DiamondWithFacets;
    let ownerFheClient: FhenixClient;
    let addr1FheClient: FhenixClient;
    let addr2FheClient: FhenixClient;
    let prizeId: bigint;
    let uniqueId: string;
    let addr1Diamond: DiamondWithFacets;
    let addr2Diamond: DiamondWithFacets;
    let chainId: string;
    let network: Network;
    let ownerDiamond: DiamondWithFacets;

    before(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        console.log("owner:", await owner.getAddress());
        console.log("addr1:", await addr1.getAddress());
        console.log("addr2:", await addr2.getAddress());
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
    });

    beforeEach(async function () {
        uniqueId = generateUniqueId();
    });

    it.skip("Should have correct Diamond setup", async function () {
        const facets = await d.facets();
        expect(facets.length).to.be.greaterThan(0, "Diamond should have facets");
        console.log(`Diamond has ${facets.length} facets`);
    });

    it.skip("Should have createPrize function", async function () {
        const createPrizeSelector = d.interface.getFunction("createPrize")?.selector;
        expect(createPrizeSelector, "createPrize selector should exist").to.not.be.undefined;

        if (createPrizeSelector) {
            const facetAddress = await d.facetAddress(createPrizeSelector);
            expect(facetAddress, "createPrize function should be present in a facet").to.not.equal(ethers.ZeroAddress);
            console.log(`createPrize function is in facet at address: ${facetAddress}`);

            const facetName = await getFacetName(d, facetAddress);
            console.log(`Facet containing createPrize: ${facetName}`);

            try {
                const prizeParams = generateRandomPrizeParams();
                await d.createPrize(prizeParams);
                console.log("createPrize function called successfully");
            } catch (error) {
                console.error(`Error calling createPrize function: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    });

    describe("Full Flow", function () {
        let prizeParams: PrizeParams;
        let scores: number[][];
        let expectedWeightedScores: number[];
        let expectedTotalScore: number;
        let expectedRewards: bigint[];

        it("should complete the full prize flow", async function () {
            // Setup Prize
            console.log("Setting up prize...");
            prizeParams = generateRandomPrizeParams(uniqueId);
            console.log("Generated prize params:", prizeParams);

            const createTx = await ownerDiamond.createPrize(prizeParams);
            await logTransaction(ownerDiamond, createTx, "Create Prize");
            prizeId = await extractPrizeIdFromTx(createTx);
            console.log("Prize created with ID:", prizeId);

            const evaluators = [addr2];
            await logTransaction(ownerDiamond, await ownerDiamond.addEvaluators(prizeId, evaluators), "Add Evaluators");

            // Open (contribution submissions)
            console.log("Moving to Open State");
            await logTransaction(ownerDiamond, await ownerDiamond.moveToNextState(prizeId), "Move to Open State");
            expect(await ownerDiamond.getState(prizeId)).to.equal(PrizeState.Open, `Prize should be in ${PrizeState[PrizeState.Open]} state`);
            console.log("Submitting contributions...");
            await logTransaction(addr1Diamond, await addr1Diamond.submitContribution(prizeId, `Contribution from addr1 ${uniqueId}`), "Submit Contribution from addr1");
            await logTransaction(addr2Diamond, await addr2Diamond.submitContribution(prizeId, `Contribution from addr2 ${uniqueId}`), "Submit Contribution from addr2");
            console.log("Contributions submitted");

            // Evaluation
            await logTransaction(ownerDiamond, await ownerDiamond.moveToNextState(prizeId), "Move to Evaluating State");
            expect(await ownerDiamond.getState(prizeId)).to.equal(PrizeState.Evaluating, `Prize should be in ${PrizeState[PrizeState.Evaluating]} state`);
            console.log("Assigning scores...");
            const criteriaCount = prizeParams.criteria.length;
            const contestants = [await addr1.getAddress(), await addr2.getAddress()];
            scores = contestants.map(() =>
                Array.from({ length: criteriaCount }, () => Math.floor(Math.random() * 100) + 1)
            );
            console.log("Generated scores:", scores);

            // Calculate expected weighted scores
            expectedWeightedScores = scores.map(contestantScores =>
                contestantScores.reduce((total, score, index) =>
                    total + score * prizeParams.criteriaWeights[index], 0)
            );
            expectedTotalScore = expectedWeightedScores.reduce((a, b) => a + b, 0);

            console.log("Expected weighted scores:", expectedWeightedScores);
            console.log("Expected total score:", expectedTotalScore);

            // Calculate expected rewar
            const scaledRewardPool = BigInt(prizeParams.pool) / PRECISION_FACTOR;
            const limitedScaledRewardPool = scaledRewardPool > MAX_UINT32 ? MAX_UINT32 : scaledRewardPool;

            const simulatedRewards = expectedWeightedScores.map(score => {
                const scaledScore = BigInt(score);
                let scaledReward = (limitedScaledRewardPool * scaledScore) / BigInt(expectedTotalScore);
                scaledReward = scaledReward > MAX_UINT32 ? MAX_UINT32 : scaledReward;
                return scaledReward * PRECISION_FACTOR;
            });

            console.log("Simulated rewards:", simulatedRewards);
            console.log("Scaled reward pool:", scaledRewardPool);
            console.log("Limited scaled reward pool:", limitedScaledRewardPool);

            const encryptedScores = await Promise.all(scores.map(async (cs, i) => {
                const fheClient = i === 0 ? addr1FheClient : addr2FheClient;
                console.log(`Encrypting scores for address ${i}...`);
                return Promise.all(cs.map(s => {
                    return fheClient.encrypt(s, EncryptionTypes.uint32);
                }));
            }));

            for (let i = 0; i < contestants.length; i++) {
                await logTransaction(addr2Diamond, await addr2Diamond.assignScoresForContestant(prizeId, contestants[i], encryptedScores[i]), `Assign Score for ${i === 0 ? 'addr1' : 'addr2'}`);
            }
            console.log("Scores assigned");

            // Allocating
            await logTransaction(ownerDiamond, await ownerDiamond.moveToNextState(prizeId), "Move to Allocating State");
            expect(await ownerDiamond.getState(prizeId)).to.equal(PrizeState.Allocating, `Prize should be in ${PrizeState[PrizeState.Allocating]} state`);
            const batchSize = 2; // Adjust as needed
            const allocateTx = await ownerDiamond.allocateRewardsBatch(prizeId, batchSize);
            await logTransaction(ownerDiamond, allocateTx, "Allocate Rewards");

            await logTransaction(ownerDiamond, await ownerDiamond.moveToNextState(prizeId), "Move to Claiming State");
            expect(await ownerDiamond.getState(prizeId)).to.equal(PrizeState.Claiming, `Prize should be in ${PrizeState[PrizeState.Claiming]} state`);

            // Claim rewards
            console.log("Claiming rewards...");

            // For addr1
            await logTransaction(addr1Diamond, await addr1Diamond.computeContestantClaimReward(prizeId), "Addr1 Compute Claim Reward");
            const addr1Permit = await addr1FheClient.generatePermit(await addr1Diamond.getAddress(), hre.ethers.provider, addr1);
            addr1FheClient.storePermit(addr1Permit);
            const addr1Permission = addr1FheClient.extractPermitPermission(addr1Permit);
            const addr1ClaimSealedResult = await addr1Diamond.viewContestantClaimReward(prizeId, addr1Permission);
            const decryptedAddr1Claim = addr1FheClient.unseal(await addr1Diamond.getAddress(), addr1ClaimSealedResult);
            console.log("Addr1 Decrypted Claim (scaled):", decryptedAddr1Claim);
            const addr1ScaledUpClaim = BigInt(decryptedAddr1Claim) * PRECISION_FACTOR;
            console.log("Addr1 Scaled Up Claim:", addr1ScaledUpClaim);

            // For addr2
            await logTransaction(addr2Diamond, await addr2Diamond.computeContestantClaimReward(prizeId), "Addr2 Compute Claim Reward");
            const addr2Permit = await addr2FheClient.generatePermit(await addr2Diamond.getAddress(), hre.ethers.provider, addr2);
            addr2FheClient.storePermit(addr2Permit);
            const addr2Permission = addr2FheClient.extractPermitPermission(addr2Permit);
            const addr2ClaimSealedResult = await addr2Diamond.viewContestantClaimReward(prizeId, addr2Permission);
            const decryptedAddr2Claim = addr2FheClient.unseal(await addr2Diamond.getAddress(), addr2ClaimSealedResult);
            console.log("Addr2 Decrypted Claim (scaled):", decryptedAddr2Claim);
            const addr2ScaledUpClaim = BigInt(decryptedAddr2Claim) * PRECISION_FACTOR;
            console.log("Addr2 Scaled Up Claim:", addr2ScaledUpClaim);

            // Check if the scaled-up claims match the expected rewards
            const claimedRewards = [addr1ScaledUpClaim, addr2ScaledUpClaim];
            console.log("Claimed rewards (scaled up):", claimedRewards);
            console.log("Simulated rewards:", simulatedRewards);
            console.log("Differences:", claimedRewards.map((claimed, i) => claimed > simulatedRewards[i] ? claimed - simulatedRewards[i] : simulatedRewards[i] - claimed));

            const tolerance = BigInt(10000000000); // 0.01 ETH
            for (let i = 0; i < claimedRewards.length; i++) {
                const difference = claimedRewards[i] > simulatedRewards[i]
                    ? claimedRewards[i] - simulatedRewards[i]
                    : simulatedRewards[i] - claimedRewards[i];
                expect(difference).to.be.lessThan(tolerance, `Claimed reward for contestant ${i + 1} should be close to expected reward`);
            }

            // Close Prize
            console.log("Closing prize...");
            await logTransaction(ownerDiamond, await ownerDiamond.moveToNextState(prizeId), "Move to Closed State");
            expect(await ownerDiamond.getState(prizeId)).to.equal(PrizeState.Closed, `Prize should be in ${PrizeState[PrizeState.Closed]} state`);
        });
    });
});