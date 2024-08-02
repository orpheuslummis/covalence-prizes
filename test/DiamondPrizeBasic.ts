import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { BaseContract } from "ethers";
import { deployments, ethers, hre } from "hardhat";
import { DiamondLoupeFacet, IPrizeManager, PrizeManagerFacet } from "../types";

describe("Diamond Prize Basic", function () {
    let diamond: BaseContract;
    let prizeManagerFacet: PrizeManagerFacet;
    let diamondLoupeFacet: DiamondLoupeFacet;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    beforeEach(async function () {
        // Get the deployed diamond address
        const diamondAddress = await deployments.get("Diamond");
        console.log("Diamond address:", diamondAddress.address);

        [owner, addr1, addr2] = await ethers.getSigners();
        console.log("Owner address:", owner.address);

        diamond = await ethers.getContractAt("Diamond", diamondAddress.address);
        prizeManagerFacet = await ethers.getContractAt("PrizeManagerFacet", diamondAddress.address) as PrizeManagerFacet;
        diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress.address) as DiamondLoupeFacet;

        // Check if createPrize function exists
        const createPrizeSelector = ethers.id("createPrize((string,string,uint256,string,string[]))").slice(0, 10);
        const facetAddress = await diamondLoupeFacet.facetAddress(createPrizeSelector);
        console.log("createPrize function facet address:", facetAddress);

        // Check if createPrize function exists
        const functionExists = await diamondLoupeFacet.supportsInterface(createPrizeSelector);
        console.log("createPrize function exists:", functionExists);

        // Log Diamond cut information
        console.log("Diamond cut information:");
        const facets = await diamondLoupeFacet.facets();
        for (const facet of facets) {
            console.log(`Facet address: ${facet.facetAddress}`);
            console.log('Selectors:', facet.functionSelectors);
        }

        // Check PrizeManagerFacet address
        const prizeManagerAddress = await diamondLoupeFacet.facetAddress(createPrizeSelector);
        console.log("PrizeManagerFacet address from Diamond:", prizeManagerAddress);
        console.log("PrizeManagerFacet address from deployment:", (await deployments.get("PrizeManagerFacet")).address);

        console.log("Current network:", hre.network.name);
    });

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

            try {
                // Create a new prize
                const tx = await prizeManagerFacet.connect(owner).createPrize(prizeParams);
                console.log("Transaction hash:", tx.hash);
                const receipt = await tx.wait();
                console.log("Transaction mined. Gas used:", receipt.gasUsed.toString());

                const event = receipt.events?.find(e => e.event === 'PrizeCreated');
                console.log("PrizeCreated event:", event);

                if (event) {
                    const [organizer, prizeAddr, name, pool] = event.args!;
                    console.log("Prize created. Address:", prizeAddr);

                    // Get the prize details
                    const prizeDetails = await prizeManagerFacet.getPrizeDetails(prizeAddr);
                    console.log("Prize details:", prizeDetails);

                    expect(organizer).to.equal(owner.address);
                    expect(ethers.isAddress(prizeAddr)).to.be.true;
                    expect(name).to.equal(prizeParams.name);
                    expect(pool).to.equal(prizeParams.pool);

                    // Assert prize details
                    expect(prizeDetails.name).to.equal(prizeParams.name);
                    expect(prizeDetails.description).to.equal(prizeParams.description);
                    expect(prizeDetails.pool).to.equal(prizeParams.pool);
                    expect(prizeDetails.status).to.equal(0); // Assuming 0 is the Setup state
                    expect(prizeDetails.criteriaNames).to.deep.equal(prizeParams.criteria);
                    expect(prizeDetails.organizer).to.equal(owner.address);
                } else {
                    console.log("PrizeCreated event not found in receipt");
                }
            } catch (error) {
                console.error("Error creating prize:", error);
                throw error;
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

            // Attempt to create an invalid prize
            await expect(prizeManagerFacet.connect(owner).createPrize(invalidPrizeParams))
                .to.be.revertedWith("Invalid input");
        });
    });
});