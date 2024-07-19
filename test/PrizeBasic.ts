import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { FhenixClient } from "fhenixjs";
import hre, { ethers } from "hardhat";
import { IAllocationStrategy, PrizeContract, PrizeManager, StrategyRegistry } from "../types";
import { FheInstance, createFheInstance } from "../utils/instance";
import { findEventInReceipt } from "./lib";
import { getTokensFromFaucet } from "./utils";

enum PrizeState { Setup, Open, Evaluating, Rewarding, Closed, Cancelled }

describe.only("PrizeBasic", function () {
    let prizeManager: PrizeManager;
    let allocationStrategy: IAllocationStrategy;
    let strategyRegistry: StrategyRegistry;
    let fheInstance: FheInstance;
    let organizer: SignerWithAddress, evaluator1: SignerWithAddress, evaluator2: SignerWithAddress;
    let contestant1: SignerWithAddress, contestant2: SignerWithAddress;
    let client: FhenixClient;

    const rewardPool = 1_000_000;
    const description = "Test Prize";
    const criteriaNames = ["Quality", "Innovation", "Feasibility"];

    before(async () => {
        [organizer, evaluator1, evaluator2, contestant1, contestant2] = await hre.ethers.getSigners();
        await Promise.all([organizer, evaluator1, evaluator2, contestant1, contestant2].map(s => getTokensFromFaucet(s.address)));
    });

    beforeEach(async () => {
        const [owner] = await hre.ethers.getSigners();

        strategyRegistry = await (await hre.ethers.getContractFactory("StrategyRegistry")).connect(owner).deploy();
        await strategyRegistry.waitForDeployment();

        prizeManager = await (await hre.ethers.getContractFactory("PrizeManager")).connect(owner).deploy(await strategyRegistry.getAddress());
        await prizeManager.waitForDeployment();

        allocationStrategy = await (await hre.ethers.getContractFactory("LinearAllocation")).connect(owner).deploy() as IAllocationStrategy;
        await allocationStrategy.waitForDeployment();

        await strategyRegistry.setStrategyAddress("LinearAllocation", await allocationStrategy.getAddress());

        fheInstance = await createFheInstance(hre, await prizeManager.getAddress());
        client = fheInstance.instance;
    });

    it("should complete a basic prize scenario", async () => {
        const weights = [30, 30, 40];

        console.log("Creating prize...");
        const tx = await prizeManager.connect(organizer).createPrize(
            description,
            rewardPool,
            "LinearAllocation",
            criteriaNames,
            weights
        );
        console.log("Transaction hash:", tx.hash);

        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);

        const prizeAddress = findEventInReceipt(receipt, 'PrizeCreated')?.args?.prizeAddress;
        if (!prizeAddress) throw new Error('Failed to get prize address');
        console.log("Prize address:", prizeAddress);

        const prizeContract = await ethers.getContractAt("PrizeContract", prizeAddress) as PrizeContract;

        expect(await prizeContract.description()).to.equal(description);
        expect(await prizeContract.state()).to.equal(PrizeState.Setup);

        await prizeContract.connect(organizer).addEvaluators([evaluator1.address, evaluator2.address]);
        expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator1.address)).to.be.true;
        expect(await prizeContract.hasRole(await prizeContract.EVALUATOR_ROLE(), evaluator2.address)).to.be.true;

        await prizeContract.connect(organizer).fundPrize({ value: rewardPool });
        expect(await prizeContract.state()).to.equal(PrizeState.Open);
        expect(await ethers.provider.getBalance(prizeAddress)).to.equal(rewardPool);

        await prizeContract.connect(contestant1).submitContribution("Contestant 1 FHE Innovation");
        await prizeContract.connect(contestant2).submitContribution("Contestant 2 FHE Innovation");
        expect((await prizeContract.contributions(contestant1.address)).description).to.equal("Contestant 1 FHE Innovation");
        expect((await prizeContract.contributions(contestant2.address)).description).to.equal("Contestant 2 FHE Innovation");

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Evaluating);

        const scores = [[[80, 70, 90], [75, 85, 80]], [[85, 75, 88], [78, 82, 85]]];
        for (let i = 0; i < 2; i++) {
            const evaluator = i === 0 ? evaluator1 : evaluator2;
            const encryptedScores = await Promise.all(scores[i].map(cs => Promise.all(cs.map(s => client.encrypt_uint32(s)))));
            const tx = await prizeContract.connect(evaluator).assignScores([contestant1.address, contestant2.address], encryptedScores);
            expect(findEventInReceipt(await tx.wait(), 'ScoresAssigned')).to.not.be.undefined;
        }

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Rewarding);
        await prizeContract.connect(organizer).allocateRewards();

        await prizeContract.connect(organizer).moveToNextState();
        expect(await prizeContract.state()).to.equal(PrizeState.Closed);

        for (const contestant of [contestant1, contestant2]) {
            const balanceBefore = await hre.ethers.provider.getBalance(contestant.address);
            await prizeContract.connect(contestant).claimReward();
            const balanceAfter = await hre.ethers.provider.getBalance(contestant.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        }

        expect(await hre.ethers.provider.getBalance(prizeAddress)).to.be.closeTo(hre.ethers.parseEther("0"), hre.ethers.parseEther("0.0001"));
    });
});