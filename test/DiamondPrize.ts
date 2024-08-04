// These tests assume the diamond already has been deployed.
// We run these tests on testnet.


import { expect } from "chai";
import { ContractTransactionReceipt, ContractTransactionResponse, EventLog, Network, Signer } from "ethers";
import { ethers } from "hardhat";
import { Context } from 'mocha';
import { Diamond, DiamondLoupeFacet, PrizeACLFacet, PrizeContributionFacet, PrizeEvaluationFacet, PrizeFundingFacet, PrizeManagerFacet, PrizeRewardFacet, PrizeStateFacet, PrizeStrategyFacet } from "../types";
import { createFheInstance } from "../utils/instance";
import contractAddresses from "../webapp/contract-addresses.json";


type ContractAddresses = {
    [chainId: string]: {
        [contractName: string]: string;
    };
};

const typedContractAddresses = contractAddresses as ContractAddresses;

const TEST_PRIZE_AMOUNT = 1000000000000000n; // 0.001 ETH in wei

type DiamondWithFacets = Diamond & PrizeManagerFacet & PrizeFundingFacet & PrizeACLFacet & PrizeContributionFacet & PrizeEvaluationFacet & PrizeRewardFacet & PrizeStateFacet & PrizeStrategyFacet;

interface TestContext extends Context {
    prizeManagerFacet: PrizeManagerFacet;
    prizeFundingFacet: PrizeFundingFacet;
    prizeACLFacet: PrizeACLFacet;
    prizeContributionFacet: PrizeContributionFacet;
    prizeEvaluationFacet: PrizeEvaluationFacet;
    prizeRewardFacet: PrizeRewardFacet;
    prizeStateFacet: PrizeStateFacet;
    prizeStrategyFacet: PrizeStrategyFacet;
    diamond: DiamondWithFacets;
    fheInstance: any;
    client: any;
    diamondLoupeFacet: DiamondLoupeFacet;
}

const FACET_NAMES = [
    "DiamondCutFacet",
    "DiamondLoupeFacet",
    "PrizeManagerFacet",
    "PrizeACLFacet",
    "PrizeContributionFacet",
    "PrizeEvaluationFacet",
    "PrizeRewardFacet",
    "PrizeStateFacet",
    "PrizeStrategyFacet",
    "PrizeFundingFacet"
];

describe("Diamond Prize Basic", function () {
    let owner: Signer;
    let addr1: Signer;
    let addr2: Signer;
    let prizeId: bigint;

    before(async function () {
        const context = this as unknown as TestContext;
        [owner, addr1, addr2] = await ethers.getSigners();

        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId.toString();
        const addresses = typedContractAddresses[chainId];

        if (!addresses) {
            throw new Error(`No contract addresses found for chain ID ${chainId}`);
        }

        const diamondAddress = addresses.Diamond;
        console.log("Diamond address:", diamondAddress);

        // Create all facet instances using the Diamond address
        context.diamond = await ethers.getContractAt("Diamond", diamondAddress, owner) as DiamondWithFacets;
        context.diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress, owner) as DiamondLoupeFacet;
        context.prizeManagerFacet = await ethers.getContractAt("PrizeManagerFacet", diamondAddress, owner) as PrizeManagerFacet;
        context.prizeACLFacet = await ethers.getContractAt("PrizeACLFacet", diamondAddress, owner) as PrizeACLFacet;
        context.prizeContributionFacet = await ethers.getContractAt("PrizeContributionFacet", diamondAddress, owner) as PrizeContributionFacet;
        context.prizeEvaluationFacet = await ethers.getContractAt("PrizeEvaluationFacet", diamondAddress, owner) as PrizeEvaluationFacet;
        context.prizeRewardFacet = await ethers.getContractAt("PrizeRewardFacet", diamondAddress, owner) as PrizeRewardFacet;
        context.prizeStateFacet = await ethers.getContractAt("PrizeStateFacet", diamondAddress, owner) as PrizeStateFacet;
        context.prizeStrategyFacet = await ethers.getContractAt("PrizeStrategyFacet", diamondAddress, owner) as PrizeStrategyFacet;
        context.prizeFundingFacet = await ethers.getContractAt("PrizeFundingFacet", diamondAddress, owner) as PrizeFundingFacet;

        context.fheInstance = await createFheInstance(ethers.provider, diamondAddress) as any;
        context.client = context.fheInstance;

        await verifyDiamondSetup(context.diamondLoupeFacet, context.prizeManagerFacet, network);

        expect(await context.prizeACLFacet.hasRole(await context.prizeACLFacet.DEFAULT_ADMIN_ROLE(), await owner.getAddress())).to.be.true;
    });

    async function verifyDiamondSetup(diamondLoupeFacet: DiamondLoupeFacet, prizeManagerFacet: PrizeManagerFacet, network: Network) {
        const facets = await diamondLoupeFacet.facets();
        console.log(`\nDiamond has ${facets.length} facets`);
        for (const facet of facets) {
            const facetName = await getFacetName(diamondLoupeFacet, facet.facetAddress);
            console.log(`Facet: ${facetName}`);
            console.log(`Address: ${facet.facetAddress}`);
            console.log("Function selectors:");
            for (const selector of facet.functionSelectors) {
                const functionName = await getFunctionName(selector);
                console.log(`  ${selector} (${functionName})`);
            }
            console.log();
        }

        const createPrizeSelector = prizeManagerFacet.interface.getFunction("createPrize").selector;
        console.log("createPrize selector:", createPrizeSelector);
        const prizeManagerFacetAddress = await diamondLoupeFacet.facetAddress(createPrizeSelector);
        console.log("PrizeManagerFacet address:", prizeManagerFacetAddress);

        console.log("\nDiamond Contract Verification:");
        const diamondAddress = await prizeManagerFacet.getAddress();
        console.log(`Diamond Address: ${diamondAddress}`);
        console.log(`Diamond contains PrizeManagerFacet: ${prizeManagerFacetAddress !== ethers.ZeroAddress}`);

        if (prizeManagerFacetAddress === ethers.ZeroAddress) {
            console.warn("PrizeManagerFacet not found in Diamond. This might indicate a deployment issue or recent upgrade.");
        }

        console.log("\nCurrent Network:", network.name);
    }

    async function getFacetName(diamondLoupeFacet: DiamondLoupeFacet, facetAddress: string): Promise<string> {
        // First, verify if the address is actually a facet
        const facetFunctionSelectors = await diamondLoupeFacet.facetFunctionSelectors(facetAddress);
        if (facetFunctionSelectors.length === 0) {
            return "Not a Facet";
        }

        // If it is a facet, try to match it with a known facet name
        for (const name of FACET_NAMES) {
            try {
                const contract = await ethers.getContractAt(name, facetAddress);
                // Check if the contract has at least one of the function selectors
                const selector = facetFunctionSelectors[0];
                if (contract.interface.getFunction(selector)) {
                    return name;
                }
            } catch (error) {
                // Contract doesn't match this facet, continue to next
            }
        }
        return "Unknown Facet";
    }

    async function getFunctionName(selector: string): Promise<string> {
        for (const name of FACET_NAMES) {
            try {
                const factory = await ethers.getContractFactory(name);
                const abi = factory.interface.fragments;
                const fragment = abi.find((f) => f.type === "function" && ethers.id(f.format()).slice(0, 10) === selector);
                if (fragment && 'name' in fragment) {
                    return fragment.name as string;
                }
            } catch (error) {
                // Contract factory not found or error in processing, continue to next
            }
        }
        return "Unknown Function";
    }

    async function extractPrizeIdFromTx(tx: ContractTransactionResponse): Promise<bigint> {
        const receipt = await tx.wait() as ContractTransactionReceipt;
        const createEvent = receipt.logs.find(
            log => log instanceof EventLog && log.eventName === 'PrizeCreated'
        ) as EventLog | undefined;

        if (!createEvent) throw new Error("PrizeCreated event not found in receipt");

        const [, newPrizeId] = createEvent.args;
        return BigInt(newPrizeId.toString());
    }

    async function createAndFundPrize(context: TestContext): Promise<bigint> {
        const prizeParams = {
            name: "Test Prize",
            description: "This is a test prize",
            pool: TEST_PRIZE_AMOUNT,
            criteria: ["Quality", "Creativity", "Innovation"],
            criteriaWeights: [40, 30, 30]
        };

        const tx = await context.prizeManagerFacet.createPrize(prizeParams);
        const prizeIdBigInt = await extractPrizeIdFromTx(tx);

        await context.prizeFundingFacet.connect(owner).fundTotally(prizeIdBigInt, { value: prizeParams.pool });
        return prizeIdBigInt;
    }

    async function submitContribution(context: TestContext, prizeId: bigint, contributor: Signer, description: string) {
        await context.prizeContributionFacet.connect(contributor).submitContribution(prizeId, description);
    }

    async function addEvaluator(context: TestContext, prizeId: bigint, evaluator: Signer) {
        await context.prizeACLFacet.connect(owner).addPrizeEvaluator(prizeId, await evaluator.getAddress());
    }

    async function assignScores(context: TestContext, prizeId: bigint, evaluator: Signer, contestants: string[], scores: number[][]) {
        const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => context.client.encrypt_uint32(s)))));
        await context.prizeEvaluationFacet.connect(evaluator).assignScores(prizeId, contestants, encryptedScores);
    }

    async function moveToNextState(context: TestContext, prizeId: bigint) {
        const tx = await context.prizeStateFacet.connect(owner).moveToNextState(prizeId);
        await tx.wait();
    }

    function testWithContext(description: string, testFn: (context: TestContext) => Promise<void>) {
        it(description, async function () {
            await testFn(this as unknown as TestContext);
        });
    }

    describe("Prelude", function () {
        it("Should connect to the network", async function () {
            const network = await ethers.provider.getNetwork();
            console.log("Connected to network:", network.name, "Chain ID:", network.chainId.toString());
        });
        it("should have code at the Diamond address", async function () {
            const network = await ethers.provider.getNetwork();
            const chainId = network.chainId.toString();
            const diamondAddress = typedContractAddresses[chainId].Diamond;
            const code = await ethers.provider.getCode(diamondAddress);
            expect(code).to.not.equal("0x");
            console.log("Diamond address has code");
        });
    });

    describe("Prize Creation and Management", function () {
        testWithContext("Should create a new prize", async (context) => {
            try {
                const prizeParams = {
                    name: "Test Prize",
                    description: "This is a test prize",
                    pool: TEST_PRIZE_AMOUNT,
                    criteria: ["Quality", "Creativity", "Innovation"],
                    criteriaWeights: [40, 30, 30]
                };

                console.log("Calling createPrize with params:", prizeParams);
                const tx = await context.prizeManagerFacet.createPrize(prizeParams);
                console.log("Transaction hash:", tx.hash);
                const prizeIdBigInt = await extractPrizeIdFromTx(tx);
                console.log("Extracted prizeId:", prizeIdBigInt.toString());

                expect(prizeIdBigInt).to.be.gt(0n);

                const prizeDetails = await context.prizeManagerFacet.getPrizeDetails(prizeIdBigInt);
                expect(prizeDetails.name).to.equal(prizeParams.name);
                expect(prizeDetails.description).to.equal(prizeParams.description);
                expect(prizeDetails.monetaryRewardPool).to.equal(prizeParams.pool);
                expect(prizeDetails.criteriaNames).to.deep.equal(prizeParams.criteria);
                expect(prizeDetails.criteriaWeights).to.deep.equal(prizeParams.criteriaWeights);
                expect(prizeDetails.state).to.equal(0); // Assuming 0 is the Setup state

                expect(await context.prizeACLFacet.isPrizeOrganizer(prizeIdBigInt, await owner.getAddress())).to.be.true;
            } catch (error) {
                console.error("Error in createPrize test:", error);
                throw error;
            }
        });

        testWithContext("Should fail to create a prize with invalid parameters", async (context) => {
            const invalidPrizeParams = {
                name: "",
                description: "This is an invalid prize",
                pool: 0n,
                criteria: [],
                criteriaWeights: []
            };

            await expect(context.prizeManagerFacet.createPrize(invalidPrizeParams))
                .to.be.revertedWith("Invalid pool amount");
        });

        testWithContext("Should fund a prize", async (context) => {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: TEST_PRIZE_AMOUNT,
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await context.prizeManagerFacet.createPrize(prizeParams);
            const prizeIdBigInt = await extractPrizeIdFromTx(tx);

            await expect(context.prizeFundingFacet.connect(owner).fundTotally(prizeIdBigInt, { value: prizeParams.pool }))
                .to.emit(context.prizeFundingFacet, "PrizeFunded")
                .withArgs(prizeIdBigInt, await owner.getAddress(), prizeParams.pool, prizeParams.pool);

            const prizeDetails = await context.prizeManagerFacet.getPrizeDetails(prizeIdBigInt);
            expect(prizeDetails.state).to.equal(1); // Assuming 1 is the Open state

            const contractBalance = await ethers.provider.getBalance(await context.diamond.getAddress());
            expect(contractBalance).to.equal(prizeParams.pool);
        });

        testWithContext("Should set up prize ACL correctly", async (context) => {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: TEST_PRIZE_AMOUNT,
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await context.prizeManagerFacet.createPrize(prizeParams);
            const prizeIdBigInt = await extractPrizeIdFromTx(tx);

            expect(await context.prizeACLFacet.isPrizeOrganizer(prizeIdBigInt, await owner.getAddress())).to.be.true;

            await context.prizeACLFacet.connect(owner).addPrizeEvaluator(prizeIdBigInt, await addr1.getAddress());
            expect(await context.prizeACLFacet.isPrizeEvaluator(prizeIdBigInt, await addr1.getAddress())).to.be.true;
        });

        testWithContext("Should set allocation strategy after prize creation", async (context) => {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: TEST_PRIZE_AMOUNT,
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await context.prizeManagerFacet.createPrize(prizeParams);
            const prizeIdBigInt = await extractPrizeIdFromTx(tx);

            // Set allocation strategy
            await context.prizeStrategyFacet.connect(owner).setAllocationStrategy(prizeIdBigInt, await context.prizeStrategyFacet.getAddress());

            // Verify allocation strategy is set
            const prizeDetails = await context.prizeManagerFacet.getPrizeDetails(prizeIdBigInt);
            expect((prizeDetails as any).allocationStrategy).to.equal(await context.prizeStrategyFacet.getAddress());
        });
    });

    describe("Prize Contributions", function () {
        beforeEach(async function () {
            const context = this as unknown as TestContext;
            prizeId = await createAndFundPrize(context);
        });

        testWithContext("Should allow submitting a contribution", async (context) => {
            await submitContribution(context, prizeId, addr1, "This is a test contribution");
            const contributionList = await context.prizeContributionFacet.getContributionList(prizeId);
            expect(contributionList).to.include(await addr1.getAddress());
        });

        testWithContext("Should allow submitting multiple contributions", async (context) => {
            await submitContribution(context, prizeId, addr1, "Contribution 1");
            await submitContribution(context, prizeId, addr2, "Contribution 2");

            const contributionList = await context.prizeContributionFacet.getContributionList(prizeId);
            expect(contributionList).to.include(await addr1.getAddress());
            expect(contributionList).to.include(await addr2.getAddress());
            expect(await context.prizeContributionFacet.getContributionCount(prizeId)).to.equal(2);
        });

        testWithContext("Should fail to submit a contribution when prize is not in Open state", async (context) => {
            const tx = await context.prizeManagerFacet.createPrize({
                name: "Test Prize",
                description: "This is a test prize",
                pool: TEST_PRIZE_AMOUNT,
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            });
            const newPrizeId = await extractPrizeIdFromTx(tx);

            await expect(submitContribution(context, newPrizeId, addr1, "Test contribution"))
                .to.be.revertedWith("Invalid state");
        });
    });

    describe("Prize State Management", function () {
        beforeEach(async function () {
            const context = this as unknown as TestContext;
            prizeId = await createAndFundPrize(context);
        });

        it("Should move through all prize states correctly", async function () {
            const context = this as unknown as TestContext;
            await submitContribution(context, prizeId, addr1, "Contribution 1");
            await submitContribution(context, prizeId, addr2, "Contribution 2");

            await moveToNextState(context, prizeId); // To Evaluating
            expect(await context.prizeStateFacet.getState(prizeId)).to.equal(2);

            await addEvaluator(context, prizeId, addr2);
            await assignScores(context, prizeId, addr2, [await addr1.getAddress(), await addr2.getAddress()], [[80, 75, 90], [85, 80, 85]]);

            await moveToNextState(context, prizeId); // To Rewarding
            expect(await context.prizeStateFacet.getState(prizeId)).to.equal(3);

            await context.prizeRewardFacet.connect(owner).allocateRewards(prizeId);

            await moveToNextState(context, prizeId); // To Closed
            expect(await context.prizeStateFacet.getState(prizeId)).to.equal(4);
        });
    });

    describe("Prize Evaluation", function () {
        beforeEach(async function () {
            const context = this as unknown as TestContext;
            prizeId = await createAndFundPrize(context);
        });

        testWithContext("Should allow evaluators to assign scores", async (context) => {
            await submitContribution(context, prizeId, addr1, "Contribution 1");
            await addEvaluator(context, prizeId, addr2);
            await moveToNextState(context, prizeId);
            await assignScores(context, prizeId, addr2, [await addr1.getAddress()], [[80, 75, 90]]);

            expect(await context.prizeEvaluationFacet.getEvaluationCount(prizeId, await addr1.getAddress())).to.equal(1);
            expect(await context.prizeEvaluationFacet.hasEvaluatorScoredContestant(prizeId, await addr2.getAddress(), await addr1.getAddress())).to.be.true;
        });

        testWithContext("Should not allow moving to Rewarding state if not all contributions are evaluated", async (context) => {
            await submitContribution(context, prizeId, addr1, "Contribution 1");
            await submitContribution(context, prizeId, addr2, "Contribution 2");
            await moveToNextState(context, prizeId);
            await assignScores(context, prizeId, addr2, [await addr1.getAddress()], [[80, 75, 90]]);

            await expect(moveToNextState(context, prizeId))
                .to.be.revertedWith("All contributions must be evaluated");
        });
    });

    describe("Prize Reward", function () {
        beforeEach(async function () {
            const context = this as unknown as TestContext;
            prizeId = await createAndFundPrize(context);
        });

        testWithContext("Should allocate and distribute rewards correctly", async (context) => {
            await submitContribution(context, prizeId, addr1, "Contribution 1");
            await addEvaluator(context, prizeId, addr2);
            await moveToNextState(context, prizeId);
            await assignScores(context, prizeId, addr2, [await addr1.getAddress()], [[80, 75, 90]]);
            await moveToNextState(context, prizeId);
            await context.prizeRewardFacet.connect(owner).allocateRewards(prizeId);

            const initialBalance = await ethers.provider.getBalance(await addr1.getAddress());
            await context.prizeRewardFacet.connect(addr1).claimReward(prizeId);
            const finalBalance = await ethers.provider.getBalance(await addr1.getAddress());

            expect(finalBalance).to.be.gt(initialBalance);

            const [, claimed] = await context.prizeRewardFacet.getContributionReward(prizeId, await addr1.getAddress());
            expect(claimed).to.be.true;

            await expect(context.prizeRewardFacet.connect(addr1).claimReward(prizeId))
                .to.be.revertedWith("Reward already claimed");
        });

        testWithContext("Should not allow moving to Closed state if not all rewards are claimed", async (context) => {
            await submitContribution(context, prizeId, addr1, "Contribution 1");
            await addEvaluator(context, prizeId, addr2);
            await moveToNextState(context, prizeId);
            await assignScores(context, prizeId, addr2, [await addr1.getAddress()], [[80, 75, 90]]);
            await moveToNextState(context, prizeId);
            await context.prizeRewardFacet.connect(owner).allocateRewards(prizeId);
            await context.prizeRewardFacet.connect(addr1).claimReward(prizeId);

            await expect(moveToNextState(context, prizeId))
                .to.be.revertedWith("All rewards must be claimed");
        });

        testWithContext("Should allocate rewards correctly", async (context) => {
            await submitContribution(context, prizeId, addr1, "Contribution 1");
            await addEvaluator(context, prizeId, addr2);
            await moveToNextState(context, prizeId);
            await assignScores(context, prizeId, addr2, [await addr1.getAddress()], [[80, 75, 90]]);
            await moveToNextState(context, prizeId);
            await context.prizeRewardFacet.connect(owner).allocateRewards(prizeId);

            const prizeDetails = await context.prizeManagerFacet.getPrizeDetails(prizeId);
            expect((prizeDetails as any).rewardsAllocated).to.be.true;

            const contributionList = await context.prizeContributionFacet.getContributionList(prizeId);
            for (const contestant of contributionList) {
                const [reward,] = await context.prizeRewardFacet.getContributionReward(prizeId, contestant);
                expect(reward).to.be.gt(0);
            }
        });
    });

    describe("Additional Tests", function () {
        beforeEach(async function () {
            const context = this as unknown as TestContext;
            prizeId = await createAndFundPrize(context);
        });

        testWithContext("Should set allocation strategy correctly", async (context) => {
            await context.prizeStrategyFacet.connect(owner).setAllocationStrategy(prizeId, await context.prizeStrategyFacet.getAddress());
            const prizeDetails = await context.prizeManagerFacet.getPrizeDetails(prizeId);
            expect((prizeDetails as any).allocationStrategy).to.equal(await context.prizeStrategyFacet.getAddress());
        });

        testWithContext("Should not allow invalid state transitions", async (context) => {
            const tx = await context.prizeManagerFacet.createPrize({
                name: "Test Prize",
                description: "This is a test prize",
                pool: TEST_PRIZE_AMOUNT,
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            });
            const newPrizeId = await extractPrizeIdFromTx(tx);

            await expect(moveToNextState(context, newPrizeId))
                .to.be.revertedWith("Prize pool must be funded before opening");

            await expect(moveToNextState(context, prizeId))
                .to.be.revertedWith("At least one contribution is required");
        });

        testWithContext("Should enforce access control for prize functions", async (context) => {
            await expect(context.prizeFundingFacet.connect(addr1).fundTotally(prizeId, { value: TEST_PRIZE_AMOUNT }))
                .to.be.revertedWith("Caller is not the prize organizer");

            await context.prizeFundingFacet.connect(owner).fundTotally(prizeId, { value: TEST_PRIZE_AMOUNT });

            const scores = [[80, 75, 90]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => context.client.encrypt_uint32(s)))));
            await expect(context.prizeEvaluationFacet.connect(addr1).assignScores(prizeId, [await addr2.getAddress()], encryptedScores))
                .to.be.revertedWith("Caller is not an evaluator for this prize");
        });
    });
});

describe.only("PrizeManagerFacet Preliminary Test", function () {
    let prizeManagerFacet: PrizeManagerFacet;

    before(async function () {
        const context = this as unknown as TestContext;
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId.toString();
        const addresses = typedContractAddresses[chainId];

        if (!addresses) {
            throw new Error(`No contract addresses found for chain ID ${chainId}`);
        }

        const diamondAddress = addresses.Diamond;
        prizeManagerFacet = await ethers.getContractAt("PrizeManagerFacet", diamondAddress) as PrizeManagerFacet;
    });

    it("should be able to call getPrizeCount()", async function () {
        try {
            const prizeCount = await prizeManagerFacet.getPrizeCount();
            console.log("Current prize count:", prizeCount.toString());
            // The test passes if we can successfully call the function without an error
        } catch (error) {
            console.error("Error calling getPrizeCount:", error);
            throw error;
        }
    });

    it("should be able to call createPrize()", async function () {
        try {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("0.001"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await prizeManagerFacet.createPrize(prizeParams);
            const receipt = await tx.wait();
            console.log("createPrize transaction hash:", tx.hash);
            console.log("Transaction receipt:", receipt);

            // Check if the prize count has increased
            const newPrizeCount = await prizeManagerFacet.getPrizeCount();
            console.log("New prize count:", newPrizeCount.toString());

            // The test passes if we can successfully call the function and get a receipt
        } catch (error) {
            console.error("Error calling createPrize:", error);
            throw error;
        }
    });
});

describe("PrizeManagerFacet Preliminary Test", function () {
    let prizeManagerFacet: PrizeManagerFacet;

    before(async function () {
        const context = this as unknown as TestContext;
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId.toString();
        const addresses = typedContractAddresses[chainId];

        if (!addresses) {
            throw new Error(`No contract addresses found for chain ID ${chainId}`);
        }

        const diamondAddress = addresses.Diamond;
        prizeManagerFacet = await ethers.getContractAt("PrizeManagerFacet", diamondAddress) as PrizeManagerFacet;
    });

    it("should be able to call getPrizeCount()", async function () {
        try {
            const prizeCount = await prizeManagerFacet.getPrizeCount();
            console.log("Current prize count:", prizeCount.toString());
            // The test passes if we can successfully call the function without an error
        } catch (error) {
            console.error("Error calling getPrizeCount:", error);
            throw error;
        }
    });

    it("should be able to call createPrize()", async function () {
        try {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("0.001"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await prizeManagerFacet.createPrize(prizeParams);
            const receipt = await tx.wait();
            console.log("createPrize transaction hash:", tx.hash);
            console.log("Transaction receipt:", receipt);

            // Check if the prize count has increased
            const newPrizeCount = await prizeManagerFacet.getPrizeCount();
            console.log("New prize count:", newPrizeCount.toString());

            // The test passes if we can successfully call the function and get a receipt
        } catch (error) {
            console.error("Error calling createPrize:", error);
            throw error;
        }
    });
});