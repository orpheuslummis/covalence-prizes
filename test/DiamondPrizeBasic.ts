import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BaseContract, ContractTransactionReceipt } from "ethers";
import { deployments, ethers, network } from "hardhat";
import { DiamondLoupeFacet, IPrizeManager, PrizeManagerFacet } from "../types";

describe("Diamond Prize Basic", function () {
    let diamond: BaseContract;
    let prizeManagerFacet: PrizeManagerFacet;
    let diamondLoupeFacet: DiamondLoupeFacet;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    async function deployDiamondFixture() {
        const diamondAddress = (await deployments.get("Diamond")).address;
        console.log("Diamond address:", diamondAddress);
        const [owner, addr1, addr2] = await ethers.getSigners();

        const diamond = await ethers.getContractAt("Diamond", diamondAddress);
        const diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress) as DiamondLoupeFacet;
        const prizeManagerFacet = await ethers.getContractAt("PrizeManagerFacet", diamondAddress) as PrizeManagerFacet;

        return { diamond, diamondLoupeFacet, prizeManagerFacet, owner, addr1, addr2 };
    }

    beforeEach(async function () {
        const { diamond, diamondLoupeFacet, prizeManagerFacet, owner, addr1, addr2 } = await loadFixture(deployDiamondFixture);

        console.log("Diamond address:", await diamond.getAddress());
        console.log("Owner address:", owner.address);

        // Verify Diamond setup
        await verifyDiamondSetup(diamondLoupeFacet, prizeManagerFacet);

        this.diamond = diamond;
        this.diamondLoupeFacet = diamondLoupeFacet;
        this.prizeManagerFacet = prizeManagerFacet;
        this.owner = owner;
        this.addr1 = addr1;
        this.addr2 = addr2;
    });

    async function verifyDiamondSetup(diamondLoupeFacet: DiamondLoupeFacet, prizeManagerFacet: PrizeManagerFacet) {
        const facets = await diamondLoupeFacet.facets();
        console.log("\nDiamond Cut Information:");
        for (const facet of facets) {
            const facetName = await getFacetName(facet.facetAddress);
            console.log(`\nFacet: ${facetName}`);
            console.log(`Address: ${facet.facetAddress}`);
            console.log("Function Selectors:");
            for (const selector of facet.functionSelectors) {
                const functionName = getFunctionName(facetName, selector);
                console.log(`  ${selector}: ${functionName}`);
            }
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
        const facetNames = ["DiamondCutFacet", "DiamondLoupeFacet", "PrizeManagerFacet", "PrizeCoreFacet", "PrizeContributionFacet", "PrizeRewardFacet", "PrizeEvaluationFacet"];
        for (const name of facetNames) {
            const deployedAddress = (await deployments.get(name)).address;
            if (deployedAddress.toLowerCase() === facetAddress.toLowerCase()) {
                return name;
            }
        }
        return "Unknown Facet";
    }

    function getFunctionName(facetName: string, selector: string): string {
        const contract = artifacts.readArtifactSync(facetName);
        const abi = contract.abi;
        for (const item of abi) {
            if (item.type === "function" && ethers.id(item.name + "(" + item.inputs.map(i => i.type).join(",") + ")").slice(0, 10) === selector) {
                return item.name;
            }
        }
        return "Unknown Function";
    }

    describe("Prize Creation", function () {
        it("Should create a new prize", async function () {
            const prizeParams: IPrizeManager.PrizeParamsStruct = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"), // 1 ETH
                strategy: "Equal Distribution",
                criteria: ["Quality", "Creativity", "Innovation"]
            };

            console.log("Attempting to create prize with params:", prizeParams);

            const tx = await this.prizeManagerFacet.connect(this.owner).createPrize(prizeParams);
            console.log("Transaction hash:", tx.hash);
            const receipt = await tx.wait() as ContractTransactionReceipt;
            console.log("Transaction mined. Gas used:", receipt.gasUsed.toString());

            const event = receipt.logs.find(log => log.fragment.name === 'PrizeCreated');
            expect(event).to.exist;

            if (event) {
                const [organizer, prizeAddr, name, pool] = event.args as [string, string, string, bigint];
                console.log("Prize created. Address:", prizeAddr);

                const prizeDetails = await this.prizeManagerFacet.getPrizeDetails(prizeAddr);
                console.log("Prize details:", prizeDetails);

                expect(organizer).to.equal(this.owner.address);
                expect(ethers.isAddress(prizeAddr)).to.be.true;
                expect(name).to.equal(prizeParams.name);
                expect(pool).to.equal(prizeParams.pool);

                expect(prizeDetails.name).to.equal(prizeParams.name);
                expect(prizeDetails.description).to.equal(prizeParams.description);
                expect(prizeDetails.pool).to.equal(prizeParams.pool);
                expect(prizeDetails.status).to.equal(0); // Assuming 0 is the Setup state
                expect(prizeDetails.criteriaNames).to.deep.equal(prizeParams.criteria);
                expect(prizeDetails.organizer).to.equal(this.owner.address);
            } else {
                throw new Error("PrizeCreated event not found in receipt");
            }
        });

        it("Should fail to create a prize with invalid parameters", async function () {
            const invalidPrizeParams: IPrizeManager.PrizeParamsStruct = {
                name: "",
                description: "This is an invalid prize",
                pool: 0n,
                strategy: "Invalid Strategy",
                criteria: []
            };

            await expect(this.prizeManagerFacet.connect(this.owner).createPrize(invalidPrizeParams))
                .to.be.revertedWith("Invalid input");
        });
    });
});