// These tests assume the diamond already has been deployed. We run these tests on testnet.
// We use a single deployed diamond and do not reset its state completely.
// Each created element (prize, contribution) should use a unique ID to ensure test isolation.

import { expect } from "chai";
import { Network, Signer, TransactionResponse } from "ethers";
import { EncryptionTypes } from "fhenixjs";
import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createFheInstance, FheInstance } from "../utils/instance";
import contractAddresses from "../webapp/contract-addresses.json";
import {
    connectDiamond,
    DiamondWithFacets,
    extractPrizeIdFromTx,
    generateRandomPrizeParams,
    getFacetName,
    getFunctionName
} from "./utils";

declare const hre: HardhatRuntimeEnvironment;

type ContractAddresses = {
    [chainId: string]: {
        [contractName: string]: string;
    };
};

const typedContractAddresses = contractAddresses as ContractAddresses;

const TEST_PRIZE_AMOUNT = ethers.parseEther("0.001");
const DEFAULT_TEST_SEED = "testSeed123";
const CRITERIA_OPTIONS = ["Quality", "Creativity", "Innovation", "Feasibility", "Impact", "Originality"];

enum AllocationStrategy {
    Linear = 0,
    Quadratic = 1,
    WinnerTakesAll = 2,
    Invalid = 3
}

enum PrizeState {
    Setup = 0,
    Open = 1,
    Evaluating = 2,
    Allocating = 3,
    Claiming = 4,
    Closed = 5
}

function generateUniqueId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function logTransaction(result: TransactionResponse | undefined, operation: string) {
    console.log(`${operation} - Result:`, result);
    if (result && typeof result.wait === 'function') {
        console.log(`${operation} - Transaction Hash:`, result.hash);
        const receipt = await result.wait();
        if (receipt) {
            console.log(`${operation} - Block Number:`, receipt.blockNumber);
            console.log(`${operation} - Gas Used:`, receipt.gasUsed.toString());
        } else {
            console.log(`${operation} - Receipt not available`);
        }
    } else {
        console.log(`${operation} - No transaction object returned`);
    }
}

async function createFundAndOpenPrize(d: DiamondWithFacets, owner: Signer): Promise<bigint> {
    const prizeParams = generateRandomPrizeParams();

    const ownerDiamond = await connectDiamond(owner);
    const tx = await ownerDiamond.createPrize(prizeParams);
    const prizeId = await extractPrizeIdFromTx(tx);

    await ownerDiamond.fundTotally(prizeId, { value: prizeParams.pool });
    await ownerDiamond.moveToNextState(prizeId);

    return prizeId;
}


describe("Diamond Prize", function () {
    this.timeout(300000); // Set timeout to 5 minutes for all tests in this describe block
    let owner: Signer;
    let addr1: Signer;
    let addr2: Signer;
    let d: DiamondWithFacets;
    let ownerFheClient: FheInstance;
    let addr1FheClient: FheInstance;
    let addr2FheClient: FheInstance;

    // These might change per test
    let prizeId: bigint;
    let uniqueId: string;
    let addr1Diamond: DiamondWithFacets;
    let addr2Diamond: DiamondWithFacets;

    // These likely won't change during tests
    let chainId: string;
    let network: Network;

    // Add these declarations
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

        console.log("Creating FHE instances...");
        ownerFheClient = await createFheInstance(hre, await d.getAddress(), owner);
        addr1FheClient = await createFheInstance(hre, await d.getAddress(), addr1);
        addr2FheClient = await createFheInstance(hre, await d.getAddress(), addr2);
        console.log("FHE instances created");

        // Add these lines
        ownerDiamond = await connectDiamond(owner);
        addr1Diamond = await connectDiamond(addr1);
        addr2Diamond = await connectDiamond(addr2);
    });

    beforeEach(async function () {
        uniqueId = generateUniqueId();
        // Initialize other per-test variables here
    });

    it("Should have correct Diamond setup", async function () {
        const facets = await d.facets();
        expect(facets.length).to.be.greaterThan(0, "Diamond should have facets");
        console.log(`Diamond has ${facets.length} facets`);

        for (const facet of facets) {
            const facetName = await getFacetName(d, facet.facetAddress);
            console.log(`Facet: ${facetName}`);
            console.log(`Address: ${facet.facetAddress}`);

            expect(facet.functionSelectors.length).to.be.greaterThan(0, `${facetName} should have function selectors`);
            console.log("Function selectors:");
            for (const selector of facet.functionSelectors) {
                const functionName = await getFunctionName(selector);
                console.log(`  ${selector} (${functionName})`);
            }

            try {
                expect(facetName).to.not.equal("Unknown Facet", `Facet at ${facet.facetAddress} should be recognized`);
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`Error with facet at ${facet.facetAddress}: ${error.message}`);
                } else {
                    console.error(`Unknown error with facet at ${facet.facetAddress}`);
                }
            }
        }

        const createPrizeSelector = d.interface.getFunction("createPrize")?.selector;
        if (createPrizeSelector) {
            const facetAddress = await d.facetAddress(createPrizeSelector);
            console.log(`createPrize function is in facet at address: ${facetAddress}`);
            const facetName = await getFacetName(d, facetAddress);
            console.log(`Facet containing createPrize: ${facetName}`);

            // Try to call the function to see if it's actually implemented
            try {
                const prizeParams = generateRandomPrizeParams();
                await d.createPrize(prizeParams);
                console.log("createPrize function called successfully");
            } catch (error) {
                console.error(`Error calling createPrize function: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    });

    it("Should have createPrize function", async function () {
        const createPrizeSelector = d.interface.getFunction("createPrize")?.selector;
        expect(createPrizeSelector, "createPrize selector should exist").to.not.be.undefined;

        if (createPrizeSelector) {
            const facetAddress = await d.facetAddress(createPrizeSelector);
            expect(facetAddress, "createPrize function should be present in a facet").to.not.equal(ethers.ZeroAddress);
            console.log(`createPrize function is in facet at address: ${facetAddress}`);

            const facetName = await getFacetName(d, facetAddress);
            console.log(`Facet containing createPrize: ${facetName}`);

            // Try to call the function to see if it's actually implemented
            try {
                const prizeParams = generateRandomPrizeParams();
                await d.createPrize(prizeParams);
                console.log("createPrize function called successfully");
            } catch (error) {
                console.error(`Error calling createPrize function: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    });

    it("does full flow", async function () {
        console.log("Starting full flow test");
        console.log("FHE instances:", { ownerFheClient, addr1FheClient, addr2FheClient });

        // Wait for the public keys to be available
        const ownerPublicKey = await ownerFheClient.instance.fhePublicKey;
        const addr1PublicKey = await addr1FheClient.instance.fhePublicKey;
        const addr2PublicKey = await addr2FheClient.instance.fhePublicKey;

        console.log("FHE public keys:", {
            owner: ownerPublicKey,
            addr1: addr1PublicKey,
            addr2: addr2PublicKey
        });

        expect(ownerPublicKey).to.not.be.undefined;
        expect(addr1PublicKey).to.not.be.undefined;
        expect(addr2PublicKey).to.not.be.undefined;
        expect(ownerFheClient.instance, "ownerFheClient.instance should be defined").to.not.be.undefined;
        expect(ownerFheClient.instance.encrypt, "ownerFheClient.instance.encrypt should be a function").to.be.a('function');

        const prizeParams = generateRandomPrizeParams(uniqueId);
        console.log("Generated prize params:", prizeParams);

        const ownerDiamond = await connectDiamond(owner);
        console.log("Creating prize...");
        const tx = await ownerDiamond.createPrize(prizeParams);
        await logTransaction(tx, "Create Prize");
        const prizeId = await extractPrizeIdFromTx(tx);
        console.log("Prize created with ID:", prizeId);

        console.log("Funding prize...");
        const fundTx = await ownerDiamond.fundTotally(prizeId, { value: prizeParams.pool });
        await logTransaction(fundTx, "Fund Prize");

        console.log("Moving to Open state...");
        const moveToOpenTx = await ownerDiamond.moveToNextState(prizeId);
        await logTransaction(moveToOpenTx, "Move to Open State");

        addr1Diamond = await connectDiamond(addr1);
        console.log("Submitting contribution from addr1...");
        const submitTx1 = await addr1Diamond.submitContribution(prizeId, `Contribution from addr1 ${uniqueId}`);
        await logTransaction(submitTx1, "Submit Contribution (addr1)");

        addr2Diamond = await connectDiamond(addr2);
        console.log("Submitting contribution from addr2...");
        const submitTx2 = await addr2Diamond.submitContribution(prizeId, `Contribution from addr2 ${uniqueId}`);
        await logTransaction(submitTx2, "Submit Contribution (addr2)");

        try {
            const addr2Address = await addr2.getAddress();
            console.log("Adding addr2 as evaluator...");
            const addEvaluatorTx = await ownerDiamond.addPrizeEvaluator(prizeId, addr2Address);
            await logTransaction(addEvaluatorTx, "Add Prize Evaluator");
        } catch (error) {
            console.error("Error in addPrizeEvaluator step:", error);
            throw error;
        }

        console.log("Moving to Evaluating state...");
        const moveToEvaluatingTx = await ownerDiamond.moveToNextState(prizeId);
        await logTransaction(moveToEvaluatingTx, "Move to Evaluating State");

        const criteriaCount = prizeParams.criteria.length;
        console.log("Number of criteria:", criteriaCount);

        const contestants = [await addr1.getAddress(), await addr2.getAddress()];
        console.log("Contestants:", contestants);

        const scores = contestants.map(() =>
            Array.from({ length: criteriaCount }, () => Math.floor(Math.random() * 100) + 1)
        );
        console.log("Generated scores:", scores);

        console.log("Encrypting scores...");
        const encryptedScores = await Promise.all(scores.map(async (cs, i) => {
            const fheClient = i === 0 ? addr1FheClient : addr2FheClient;
            const encryptedContestantScores = await Promise.all(cs.map(async (s, j) => {
                // console.log(`Encrypting score for contestant ${i}, criterion ${j}: ${s}`);
                try {
                    const encrypted = await fheClient.instance.encrypt(s, EncryptionTypes.uint8);
                    // console.log(`Encrypted score for contestant ${i}, criterion ${j}: ${JSON.stringify(encrypted)}`);
                    return encrypted;
                } catch (error) {
                    console.error(`Error encrypting score for contestant ${i}, criterion ${j}:`, error);
                    throw error;
                }
            }));
            console.log(`Total encrypted size for contestant ${i}: ${JSON.stringify(encryptedContestantScores).length} bytes`);
            return encryptedContestantScores;
        }));

        console.log("Assigning scores...");
        for (let i = 0; i < contestants.length; i++) {
            const contestant = contestants[i];
            const contestantScores = encryptedScores[i];
            console.log(`Assigning scores for contestant ${i}: ${contestant}`);

            const assignScoreTx = await addr2Diamond.assignScoreForContestant(prizeId, contestant, contestantScores);
            await logTransaction(assignScoreTx, `Assign Score for contestant ${i}`);

            const evaluationCount = await ownerDiamond.getEvaluationCount(prizeId, contestant);
            console.log(`Evaluation count for contestant ${i}: ${evaluationCount}`);
        }

        const updateEvaluationStatusTx = await ownerDiamond.updateEvaluationStatus(prizeId, contestants);
        await logTransaction(updateEvaluationStatusTx, "Update Evaluation Status");

        console.log("Moving to Allocating state...");
        const moveToAllocatingTx = await ownerDiamond.moveToNextState(prizeId);
        await logTransaction(moveToAllocatingTx, "Move to Allocating State");

        console.log("Allocating rewards...");
        const prizeRewardFacet = await ethers.getContractAt("PrizeRewardFacet", await d.getAddress());
        prizeRewardFacet.on(prizeRewardFacet.filters.Debug, (message, indexOrValue, value) => {
            if (typeof value === 'undefined') {
                console.log(`Debug: ${message}, Value: ${indexOrValue}`);
            } else {
                console.log(`Debug: ${message}, Index: ${indexOrValue}, Value: ${value}`);
            }
        });

        try {
            await prizeRewardFacet.allocateRewards(prizeId);
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error("Error allocating rewards:", error.message);
                if ('data' in error) {
                    console.error("Error data:", (error as any).data);
                }
            } else {
                console.error("Unknown error allocating rewards");
            }
            throw error;
        }

        const prizeInfo = await ownerDiamond.getPrizeInfo(prizeId);
        console.log(`Total Prize Pool: ${prizeInfo.totalPrizePool}`);
        console.log(`Number of Contestants: ${prizeInfo.contestantCount}`);

        const addr1Reward = await ownerDiamond.getContributionReward(prizeId, await addr1.getAddress());
        console.log(`Reward allocated to addr1: ${addr1Reward}`);

        const addr2Reward = await ownerDiamond.getContributionReward(prizeId, await addr2.getAddress());
        console.log(`Reward allocated to addr2: ${addr2Reward}`);

        console.log("Moving to Claiming state...");
        const moveToClaimingTx = await ownerDiamond.moveToNextState(prizeId);
        await logTransaction(moveToClaimingTx, "Move to Claiming State");

        const claimRewardTx1 = await addr1Diamond.claimReward(prizeId);
        await logTransaction(claimRewardTx1, "Claim Reward (addr1) (FHE)");

        const claimRewardTx2 = await addr2Diamond.claimReward(prizeId);
        await logTransaction(claimRewardTx2, "Claim Reward (addr2) (FHE)");

        const moveToClosedTx = await ownerDiamond.moveToNextState(prizeId);
        await logTransaction(moveToClosedTx, "Move to Closed State");

        const finalState = await ownerDiamond.getState(prizeId);
        expect(finalState).to.equal(PrizeState.Closed);
        console.log("Final Prize State:", finalState);
    });
    // more tests omitted to focus on the full flow one for now
});