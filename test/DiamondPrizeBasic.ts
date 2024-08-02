import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { BaseContract } from "ethers";
import { deployments, ethers } from "hardhat";
import { IPrizeManager, PrizeManagerFacet } from "../types";
import { diamondFixture } from "./fixtures/diamondFixture";

describe("Diamond Prize Basic", function () {
    let diamond: BaseContract;
    let prizeManagerFacet: PrizeManagerFacet;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    beforeEach(async function () {
        await deployments.fixture(["Diamond"]);
        const { diamond: diamondContract, facets } = await diamondFixture();
        [owner, addr1, addr2] = await ethers.getSigners();

        diamond = diamondContract;
        prizeManagerFacet = await ethers.getContractAt("PrizeManagerFacet", await diamond.getAddress()) as PrizeManagerFacet;
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

            // Create a new prize
            await expect(prizeManagerFacet.connect(owner).createPrize(prizeParams))
                .to.emit(prizeManagerFacet, "PrizeCreated")
                .withArgs(owner.address, (address: string) => ethers.isAddress(address), prizeParams.name, prizeParams.pool);

            // Get the prize details
            const prizeDetails = await prizeManagerFacet.getPrizeDetails(0);

            // Assert prize details
            expect(prizeDetails.name).to.equal(prizeParams.name);
            expect(prizeDetails.description).to.equal(prizeParams.description);
            expect(prizeDetails.pool).to.equal(prizeParams.pool);
            expect(prizeDetails.status).to.equal(0); // Assuming 0 is the Setup state
            expect(prizeDetails.criteriaNames).to.deep.equal(prizeParams.criteria);
            expect(prizeDetails.organizer).to.equal(owner.address);
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

        it("Should fail to create a prize from non-manager account", async function () {
            const prizeParams: IPrizeManager.PrizeParamsStruct = {
                name: "Test Prize",
                description: "This is a test prize",
                pool: ethers.parseEther("1"),
                strategy: "Equal Distribution",
                criteria: ["Quality", "Creativity", "Innovation"]
            };

            // Attempt to create a prize from non-manager account
            await expect(prizeManagerFacet.connect(addr1).createPrize(prizeParams))
                .to.be.revertedWith("Caller is not a prize manager");
        });
    });
});