import { expect } from "chai";
import hre from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { StrategyRegistry } from "../types";

describe("StrategyRegistry", function () {
    let strategyRegistry: StrategyRegistry;
    let owner: SignerWithAddress;
    let nonOwner: SignerWithAddress;

    beforeEach(async function () {
        const accounts = await hre.ethers.getSigners();
        owner = accounts[0];
        nonOwner = accounts[1];

        const StrategyRegistry = await hre.ethers.getContractFactory("StrategyRegistry");
        strategyRegistry = await StrategyRegistry.connect(owner).deploy();
        await strategyRegistry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("should set the correct owner", async function () {
            expect(await strategyRegistry.owner()).to.equal(owner.address);
        });
    });

    describe("setStrategyAddress", function () {
        it("should allow owner to set strategy address", async function () {
            const strategyName = "TestStrategy";
            const strategyAddress = "0x1234567890123456789012345678901234567890";

            await strategyRegistry.connect(owner).setStrategyAddress(strategyName, strategyAddress);
            expect(await strategyRegistry.getStrategyAddress(strategyName)).to.equal(strategyAddress);
        });

        it("should revert when non-owner tries to set strategy address", async function () {
            const strategyName = "TestStrategy";
            const strategyAddress = "0x1234567890123456789012345678901234567890";

            await expect(
                strategyRegistry.connect(nonOwner).setStrategyAddress(strategyName, strategyAddress)
            ).to.be.revertedWith("Only owner can perform this action");
        });

        it("should revert when setting invalid strategy address", async function () {
            const strategyName = "TestStrategy";
            const invalidAddress = "0x0000000000000000000000000000000000000000";

            await expect(
                strategyRegistry.connect(owner).setStrategyAddress(strategyName, invalidAddress)
            ).to.be.revertedWith("Invalid strategy address");
        });
    });

    describe("removeStrategyAddress", function () {
        it("should allow owner to remove strategy address", async function () {
            const strategyName = "TestStrategy";
            const strategyAddress = "0x1234567890123456789012345678901234567890";

            await strategyRegistry.connect(owner).setStrategyAddress(strategyName, strategyAddress);
            await strategyRegistry.connect(owner).removeStrategyAddress(strategyName);

            await expect(
                strategyRegistry.getStrategyAddress(strategyName)
            ).to.be.revertedWith("Unknown strategy name");
        });

        it("should revert when non-owner tries to remove strategy address", async function () {
            const strategyName = "TestStrategy";

            await expect(
                strategyRegistry.connect(nonOwner).removeStrategyAddress(strategyName)
            ).to.be.revertedWith("Only owner can perform this action");
        });

        it("should revert when removing non-existent strategy", async function () {
            const strategyName = "NonExistentStrategy";

            await expect(
                strategyRegistry.connect(owner).removeStrategyAddress(strategyName)
            ).to.be.revertedWith("Strategy not found");
        });
    });

    describe("getStrategyAddress", function () {
        it("should return correct strategy address", async function () {
            const strategyName = "TestStrategy";
            const strategyAddress = "0x1234567890123456789012345678901234567890";

            await strategyRegistry.connect(owner).setStrategyAddress(strategyName, strategyAddress);
            expect(await strategyRegistry.getStrategyAddress(strategyName)).to.equal(strategyAddress);
        });

        it("should revert when querying unknown strategy name", async function () {
            const unknownStrategyName = "UnknownStrategy";

            await expect(
                strategyRegistry.getStrategyAddress(unknownStrategyName)
            ).to.be.revertedWith("Unknown strategy name");
        });
    });
});