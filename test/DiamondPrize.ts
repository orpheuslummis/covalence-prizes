// These tests assume the diamond already has been deployed

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BaseContract, ContractTransactionReceipt } from "ethers";
import { FhenixClient } from "fhenixjs";
import { deployments, ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DiamondLoupeFacet, PrizeACLFacet, PrizeContributionFacet, PrizeEvaluationFacet, PrizeFundingFacet, PrizeManagerFacet, PrizeRewardFacet, PrizeStateFacet, PrizeStrategyFacet } from "../types";
import { FheInstance, createFheInstance } from "../utils/instance";

describe("Diamond Prize Basic", function () {
    let diamond: BaseContract;
    let prizeManagerFacet: PrizeManagerFacet;
    let prizeACLFacet: PrizeACLFacet;
    let prizeContributionFacet: PrizeContributionFacet;
    let prizeEvaluationFacet: PrizeEvaluationFacet;
    let prizeRewardFacet: PrizeRewardFacet;
    let prizeStateFacet: PrizeStateFacet;
    let prizeStrategyFacet: PrizeStrategyFacet;
    let prizeFundingFacet: PrizeFundingFacet;
    let diamondLoupeFacet: DiamondLoupeFacet;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let fheInstance: FheInstance;
    let client: FhenixClient;
    let hre: HardhatRuntimeEnvironment;

    async function deployDiamondFixture() {
        const diamondAddress = (await deployments.get("Diamond")).address;
        console.log("Diamond address:", diamondAddress);
        const [owner, addr1, addr2] = await ethers.getSigners();

        const diamond = await ethers.getContractAt("Diamond", diamondAddress);
        const diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress) as DiamondLoupeFacet;
        const prizeManagerFacet = await ethers.getContractAt("PrizeManagerFacet", diamondAddress) as PrizeManagerFacet;
        const prizeACLFacet = await ethers.getContractAt("PrizeACLFacet", diamondAddress) as PrizeACLFacet;
        const prizeContributionFacet = await ethers.getContractAt("PrizeContributionFacet", diamondAddress) as PrizeContributionFacet;
        const prizeEvaluationFacet = await ethers.getContractAt("PrizeEvaluationFacet", diamondAddress) as PrizeEvaluationFacet;
        const prizeRewardFacet = await ethers.getContractAt("PrizeRewardFacet", diamondAddress) as PrizeRewardFacet;
        const prizeStateFacet = await ethers.getContractAt("PrizeStateFacet", diamondAddress) as PrizeStateFacet;
        const prizeStrategyFacet = await ethers.getContractAt("PrizeStrategyFacet", diamondAddress) as PrizeStrategyFacet;
        const prizeFundingFacet = await ethers.getContractAt("PrizeFundingFacet", diamondAddress) as PrizeFundingFacet;

        return { diamond, diamondLoupeFacet, prizeManagerFacet, prizeACLFacet, prizeContributionFacet, prizeEvaluationFacet, prizeRewardFacet, prizeStateFacet, prizeStrategyFacet, prizeFundingFacet, owner, addr1, addr2 };
    }

    beforeEach(async function () {
        const { diamond, diamondLoupeFacet, prizeManagerFacet, prizeACLFacet, prizeContributionFacet, prizeEvaluationFacet, prizeRewardFacet, prizeStateFacet, prizeStrategyFacet, prizeFundingFacet, owner, addr1, addr2 } = await loadFixture(deployDiamondFixture);

        console.log("Diamond address:", await diamond.getAddress());
        console.log("Owner address:", owner.address);

        // Verify Diamond setup
        await verifyDiamondSetup(diamondLoupeFacet, prizeManagerFacet);

        this.diamond = diamond;
        this.diamondLoupeFacet = diamondLoupeFacet;
        this.prizeManagerFacet = prizeManagerFacet;
        this.prizeACLFacet = prizeACLFacet;
        this.prizeContributionFacet = prizeContributionFacet;
        this.prizeEvaluationFacet = prizeEvaluationFacet;
        this.prizeRewardFacet = prizeRewardFacet;
        this.prizeStateFacet = prizeStateFacet;
        this.prizeStrategyFacet = prizeStrategyFacet;
        this.prizeFundingFacet = prizeFundingFacet;
        this.owner = owner;
        this.addr1 = addr1;
        this.addr2 = addr2;

        // Initialize FHE
        fheInstance = await createFheInstance(ethers.provider, await diamond.getAddress());
        client = fheInstance.instance;

        // Verify PrizeACLFacet initialization
        expect(await this.prizeACLFacet.hasRole(await this.prizeACLFacet.DEFAULT_ADMIN_ROLE(), this.owner.address)).to.be.true;
    });

    async function verifyDiamondSetup(diamondLoupeFacet: DiamondLoupeFacet, prizeManagerFacet: PrizeManagerFacet) {
        const facets = await diamondLoupeFacet.facets();
        console.log("\nDiamond Cut Information:\n");
        for (const facet of facets) {
            const facetName = await getFacetName(facet.facetAddress);
            console.log(`Facet: ${facetName || "Unknown Facet"}`);
            console.log(`Address: ${facet.facetAddress}`);
            console.log("Function Selectors:");
            for (const selector of facet.functionSelectors) {
                const functionName = getFunctionName(facetName, selector);
                console.log(`  ${selector}: ${functionName}`);
            }
            console.log();
        }

        // Verify PrizeManagerFacet
        const createPrizeSelector = prizeManagerFacet.interface.getFunction("createPrize").selector;
        const facetAddress = await diamondLoupeFacet.facetAddress(createPrizeSelector);
        const prizeManagerAddress = (await deployments.get("PrizeManagerFacet")).address;

        console.log("\nPrizeManagerFacet Verification:");
        console.log(`createPrize Selector: ${createPrizeSelector}`);
        console.log(`Facet Address from Diamond: ${facetAddress}`);
        console.log(`Address from Deployment: ${prizeManagerAddress}`);
        console.log(`Match: ${prizeManagerAddress.toLowerCase() === facetAddress.toLowerCase()}`);

        expect(facetAddress.toLowerCase()).to.equal(prizeManagerAddress.toLowerCase(), "PrizeManagerFacet address mismatch");

        console.log("\nCurrent Network:", network.name);
    }

    // Helper functions
    async function getFacetName(facetAddress: string): Promise<string> {
        const facetNames = ["DiamondCutFacet", "DiamondLoupeFacet", "PrizeManagerFacet", "PrizeACLFacet", "PrizeContributionFacet", "PrizeEvaluationFacet", "PrizeRewardFacet", "PrizeStateFacet", "PrizeStrategyFacet"];
        for (const name of facetNames) {
            const deployedAddress = (await deployments.get(name)).address;
            if (deployedAddress.toLowerCase() === facetAddress.toLowerCase()) {
                return name;
            }
        }
        return "Unknown Facet";
    }

    function getFunctionName(facetName: string, selector: string): string {
        try {
            if (!facetName) return "Unknown Function";
            const artifact = artifacts.readArtifactSync(facetName);
            const fragment = artifact.abi.find((f: any) => f.type === "function" && f.selector === selector);
            return fragment ? fragment.name : "Unknown Function";
        } catch (error) {
            return "Unknown Function";
        }
    }

    describe("Prize Creation and Management", function () {
        it("Should create a new prize", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"), // 1 ETH
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            console.log("Attempting to create prize with params:", prizeParams);

            const tx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            console.log("Transaction hash:", tx.hash);
            const receipt = await tx.wait() as ContractTransactionReceipt;
            console.log("Transaction mined. Gas used:", receipt.gasUsed.toString());

            const event = receipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            expect(event).to.exist;

            if (event) {
                const [organizer, prizeId, name, pool] = event.args as [string, bigint, string, bigint];
                console.log("Prize created. ID:", prizeId.toString());

                const prizeDetails = await this.prizeManagerFacet.getPrizeDetails(prizeId);
                console.log("Prize details:", prizeDetails);

                expect(organizer).to.equal(this.owner.address);
                expect(name).to.equal(prizeParams.name);
                expect(pool).to.equal(prizeParams.pool);

                expect(prizeDetails.name).to.equal(prizeParams.name);
                expect(prizeDetails.description).to.equal(prizeParams.description);
                expect(prizeDetails.monetaryRewardPool).to.equal(prizeParams.pool);
                expect(prizeDetails.state).to.equal(0); // Assuming 0 is the Setup state
                expect(prizeDetails.criteriaNames).to.deep.equal(prizeParams.criteria);
                expect(prizeDetails.criteriaWeights).to.deep.equal(prizeParams.criteriaWeights);
                expect(prizeDetails.organizer).to.equal(this.owner.address);

                expect(event).to.emit(this.prizeManagerFacet, "PrizeCreated")
                    .withArgs(this.owner.address, prizeId, prizeParams.name, prizeParams.pool);
            } else {
                throw new Error("PrizeCreated event not found in receipt");
            }
        });

        it("Should fail to create a prize with invalid parameters", async function () {
            const invalidPrizeParams = {
                name: "",
                description: "This is an invalid prize",
                pool: 0n,
                criteria: [],
                criteriaWeights: []
            };

            await expect(this.prizeManagerFacet.connect(this.owner).createPrize(invalidPrizeParams))
                .to.be.revertedWith("Invalid input");
        });

        it("Should fund a prize", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const receipt = await tx.wait() as ContractTransactionReceipt;
            const event = receipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = event!.args as [string, bigint, string, bigint];

            await expect(this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool }))
                .to.emit(this.prizeFundingFacet, "PrizeFunded")
                .withArgs(prizeId, this.owner.address, prizeParams.pool, prizeParams.pool);

            const prizeDetails = await this.prizeManagerFacet.getPrizeDetails(prizeId);
            expect(prizeDetails.state).to.equal(1); // Assuming 1 is the Open state

            const contractBalance = await ethers.provider.getBalance(await this.diamond.getAddress());
            expect(contractBalance).to.equal(prizeParams.pool);
        });

        it("Should set up prize ACL correctly", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const receipt = await tx.wait() as ContractTransactionReceipt;
            const event = receipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = event!.args as [string, bigint, string, bigint];

            expect(await this.prizeACLFacet.isPrizeOrganizer(prizeId, this.owner.address)).to.be.true;

            await this.prizeACLFacet.connect(this.owner).addPrizeEvaluator(prizeId, this.addr1.address);
            expect(await this.prizeACLFacet.isPrizeEvaluator(prizeId, this.addr1.address)).to.be.true;
        });

        it("Should set allocation strategy after prize creation", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };

            const tx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const receipt = await tx.wait() as ContractTransactionReceipt;
            const event = receipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = event!.args as [string, bigint, string, bigint];

            // Set allocation strategy
            await this.prizeStrategyFacet.connect(this.owner).setAllocationStrategy(prizeId, await this.prizeStrategyFacet.getAddress());

            // Verify allocation strategy is set
            const prizeDetails = await this.prizeManagerFacet.getPrizeDetails(prizeId);
            expect(prizeDetails.allocationStrategy).to.equal(await this.prizeStrategyFacet.getAddress());
        });
    });

    describe("Prize Contributions", function () {
        it("Should allow submitting a contribution", async function () {
            // Create and fund a prize first
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit a contribution
            const contributionDescription = "This is a test contribution";
            await expect(this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, contributionDescription))
                .to.emit(this.prizeContributionFacet, "ContributionAdded")
                .withArgs(this.addr1.address, contributionDescription);

            const contributionList = await this.prizeContributionFacet.getContributionList(prizeId);
            expect(contributionList).to.include(this.addr1.address);
        });

        it("Should allow submitting multiple contributions", async function () {
            // Create and fund a prize first
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit contributions
            await this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Contribution 1");
            await this.prizeContributionFacet.connect(this.addr2).submitContribution(prizeId, "Contribution 2");

            const contributionList = await this.prizeContributionFacet.getContributionList(prizeId);
            expect(contributionList).to.include(this.addr1.address);
            expect(contributionList).to.include(this.addr2.address);
            expect(await this.prizeContributionFacet.getContributionCount(prizeId)).to.equal(2);
        });

        it("Should fail to submit a contribution when prize is not in Open state", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            // Prize is in Setup state, not Open
            await expect(this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Test contribution"))
                .to.be.revertedWith("Invalid state");
        });
    });

    describe("Prize State Management", function () {
        it("Should move through all prize states correctly", async function () {
            // Create and fund a prize
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit contributions
            await this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Contribution 1");
            await this.prizeContributionFacet.connect(this.addr2).submitContribution(prizeId, "Contribution 2");

            // Move to Evaluating state
            const oldState = await this.prizeStateFacet.getState(prizeId);
            const newState = 2; // Evaluating state
            const tx = await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);
            expect(await this.prizeStateFacet.getState(prizeId)).to.equal(newState);
            await expect(tx).to.emit(this.prizeStateFacet, "StateChanged").withArgs(prizeId, oldState, newState);

            // Perform evaluations
            await this.prizeACLFacet.connect(this.owner).addPrizeEvaluator(prizeId, this.addr2.address);
            const scores = [[80, 75, 90], [85, 80, 85]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            await this.prizeEvaluationFacet.connect(this.addr2).assignScores(prizeId, [this.addr1.address, this.addr2.address], encryptedScores);

            // Move to Rewarding state
            const oldState2 = await this.prizeStateFacet.getState(prizeId);
            const newState2 = 3; // Rewarding state
            const tx2 = await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);
            expect(await this.prizeStateFacet.getState(prizeId)).to.equal(newState2);
            await expect(tx2).to.emit(this.prizeStateFacet, "StateChanged").withArgs(prizeId, oldState2, newState2);

            // Allocate rewards
            await this.prizeRewardFacet.connect(this.owner).allocateRewards(prizeId);

            // Move to Closed state
            const oldState3 = await this.prizeStateFacet.getState(prizeId);
            const newState3 = 4; // Closed state
            const tx3 = await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);
            expect(await this.prizeStateFacet.getState(prizeId)).to.equal(newState3);
            await expect(tx3).to.emit(this.prizeStateFacet, "StateChanged").withArgs(prizeId, oldState3, newState3);
        });
    });

    describe("Prize Evaluation", function () {
        it("Should allow evaluators to assign scores", async function () {
            // Create and fund a prize
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit a contribution
            await this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Contribution 1");

            // Add an evaluator
            await this.prizeACLFacet.connect(this.owner).addPrizeEvaluator(prizeId, this.addr2.address);

            // Move to Evaluating state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Assign scores
            const scores = [[80, 75, 90]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            await this.prizeEvaluationFacet.connect(this.addr2).assignScores(prizeId, [this.addr1.address], encryptedScores);

            // Verify evaluation
            expect(await this.prizeEvaluationFacet.getEvaluationCount(prizeId, this.addr1.address)).to.equal(1);
            expect(await this.prizeEvaluationFacet.hasEvaluatorScoredContestant(prizeId, this.addr2.address, this.addr1.address)).to.be.true;
        });

        it("Should not allow moving to Rewarding state if not all contributions are evaluated", async function () {
            // Create and fund a prize
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit two contributions
            await this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Contribution 1");
            await this.prizeContributionFacet.connect(this.addr2).submitContribution(prizeId, "Contribution 2");

            // Move to Evaluating state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Evaluate only one contribution
            const scores = [[80, 75, 90]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            await this.prizeEvaluationFacet.connect(this.addr2).assignScores(prizeId, [this.addr1.address], encryptedScores);

            // Try to move to Rewarding state (should fail)
            await expect(this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId))
                .to.be.revertedWith("All contributions must be evaluated");
        });
    });

    describe("Prize Reward", function () {
        it("Should allocate and distribute rewards correctly", async function () {
            // Create and fund a prize
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit a contribution
            await this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Contribution 1");

            // Add an evaluator
            await this.prizeACLFacet.connect(this.owner).addPrizeEvaluator(prizeId, this.addr2.address);

            // Move to Evaluating state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Assign scores
            const scores = [[80, 75, 90]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            await this.prizeEvaluationFacet.connect(this.addr2).assignScores(prizeId, [this.addr1.address], encryptedScores);

            // Move to Rewarding state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Allocate rewards
            await this.prizeRewardFacet.connect(this.owner).allocateRewards(prizeId);

            // Claim reward
            const initialBalance = await ethers.provider.getBalance(this.addr1.address);
            await this.prizeRewardFacet.connect(this.addr1).claimReward(prizeId);
            const finalBalance = await ethers.provider.getBalance(this.addr1.address);

            // Verify reward was claimed
            expect(finalBalance).to.be.gt(initialBalance);

            // Verify reward is marked as claimed
            const [, claimed] = await this.prizeRewardFacet.getContributionReward(prizeId, this.addr1.address);
            expect(claimed).to.be.true;

            // Try to claim again (should fail)
            await expect(this.prizeRewardFacet.connect(this.addr1).claimReward(prizeId))
                .to.be.revertedWith("Reward already claimed");
        });

        it("Should not allow moving to Closed state if not all rewards are claimed", async function () {
            // Create, fund, and evaluate a prize
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit a contribution
            await this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Contribution 1");

            // Add an evaluator
            await this.prizeACLFacet.connect(this.owner).addPrizeEvaluator(prizeId, this.addr2.address);

            // Move to Evaluating state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Assign scores
            const scores = [[80, 75, 90]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            await this.prizeEvaluationFacet.connect(this.addr2).assignScores(prizeId, [this.addr1.address], encryptedScores);

            // Move to Rewarding state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Allocate rewards
            await this.prizeRewardFacet.connect(this.owner).allocateRewards(prizeId);

            // Claim reward for only one contestant
            await this.prizeRewardFacet.connect(this.addr1).claimReward(prizeId);

            // Try to move to Closed state (should fail)
            await expect(this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId))
                .to.be.revertedWith("All rewards must be claimed");
        });

        it("Should allocate rewards correctly", async function () {
            // Create, fund, and evaluate a prize
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Submit a contribution
            await this.prizeContributionFacet.connect(this.addr1).submitContribution(prizeId, "Contribution 1");

            // Add an evaluator
            await this.prizeACLFacet.connect(this.owner).addPrizeEvaluator(prizeId, this.addr2.address);

            // Move to Evaluating state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Assign scores
            const scores = [[80, 75, 90]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            await this.prizeEvaluationFacet.connect(this.addr2).assignScores(prizeId, [this.addr1.address], encryptedScores);

            // Move to Rewarding state
            await this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId);

            // Allocate rewards
            await this.prizeRewardFacet.connect(this.owner).allocateRewards(prizeId);

            // Verify rewards are allocated
            const prizeDetails = await this.prizeManagerFacet.getPrizeDetails(prizeId);
            expect(prizeDetails.rewardsAllocated).to.be.true;

            // Verify each contestant has a reward allocated
            const contributionList = await this.prizeContributionFacet.getContributionList(prizeId);
            for (const contestant of contributionList) {
                const [reward,] = await this.prizeRewardFacet.getContributionReward(prizeId, contestant);
                expect(reward).to.be.gt(0);
            }
        });
    });

    describe("Additional Tests", function () {
        it("Should set allocation strategy correctly", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            // Set allocation strategy
            await this.prizeStrategyFacet.connect(this.owner).setAllocationStrategy(prizeId, await this.prizeStrategyFacet.getAddress());

            // Verify allocation strategy is set
            const prizeDetails = await this.prizeManagerFacet.getPrizeDetails(prizeId);
            expect(prizeDetails.allocationStrategy).to.equal(await this.prizeStrategyFacet.getAddress());
        });

        it("Should not allow invalid state transitions", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            // Try to move from Setup to Evaluating (should fail)
            await expect(this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId))
                .to.be.revertedWith("Prize pool must be funded before opening");

            // Fund the prize
            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Try to move from Open to Rewarding (should fail)
            await expect(this.prizeStateFacet.connect(this.owner).moveToNextState(prizeId))
                .to.be.revertedWith("At least one contribution is required");
        });

        it("Should enforce access control for prize functions", async function () {
            const prizeParams = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                criteria: ["Quality", "Creativity", "Innovation"],
                criteriaWeights: [40, 30, 30]
            };
            const createTx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            const createReceipt = await createTx.wait() as ContractTransactionReceipt;
            const createEvent = createReceipt.logs.find(log => log.fragment?.name === 'PrizeCreated');
            const [, prizeId] = createEvent!.args as [string, bigint, string, bigint];

            // Non-owner tries to fund the prize (should fail)
            await expect(this.prizeFundingFacet.connect(this.addr1).fundTotally(prizeId, { value: prizeParams.pool }))
                .to.be.revertedWith("Caller is not the prize organizer");

            // Fund the prize correctly
            await this.prizeFundingFacet.connect(this.owner).fundTotally(prizeId, { value: prizeParams.pool });

            // Non-evaluator tries to assign scores (should fail)
            const scores = [[80, 75, 90]];
            const encryptedScores = await Promise.all(scores.map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            await expect(this.prizeEvaluationFacet.connect(this.addr1).assignScores(prizeId, [this.addr2.address], encryptedScores))
                .to.be.revertedWith("Caller is not an evaluator for this prize");
        });
    });
});