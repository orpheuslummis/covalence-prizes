import { EventLog } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getContractHash } from "../deploy/deploy";

function getExplorerUrl(network: string, address: string): string {
    const explorerBaseUrls: { [key: string]: string } = {
        testnet: "https://explorer.helium.fhenix.zone",
        mainnet: "https://explorer.fhenix.zone",
        // Add other networks as needed
    };
    const baseUrl = explorerBaseUrls[network] || "https://explorer.helium.fhenix.zone"; // Default to testnet
    return `${baseUrl}/address/${address}`;
}

task("task:createPrize")
    .addParam("description", "Description of the prize")
    .addParam("rewardpool", "Total reward pool for the prize")
    .addParam("strategy", "Allocation strategy name")
    .addParam("criteria", "Comma-separated list of criteria names")
    .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
        const { ethers, deployments } = hre;
        const [deployer] = await ethers.getSigners();

        console.log("Creating prize with account:", deployer.address);
        console.log("Current network:", hre.network.name);

        // Get PrizeManager contract
        const prizeManagerHash = getContractHash('PrizeManager');
        const prizeManagerName = `PrizeManager_${prizeManagerHash}`;
        const PrizeManagerDeployment = await deployments.get(prizeManagerName);
        const prizeManager = await ethers.getContractAt("PrizeManager", PrizeManagerDeployment.address);

        // Parse task arguments
        const { description, strategy } = taskArgs;
        const rewardPool = ethers.parseEther(taskArgs.rewardpool);
        const criteriaNames = taskArgs.criteria.split(",");

        // Log prize details
        console.log("Prize details:", {
            description,
            rewardPool: ethers.formatEther(rewardPool) + " ETH",
            strategy,
            criteriaNames,
            prizeManagerAddress: PrizeManagerDeployment.address,
            prizeManagerExplorerUrl: getExplorerUrl(hre.network.name, PrizeManagerDeployment.address),
            deployerBalance: ethers.formatEther(await ethers.provider.getBalance(deployer.address)) + " ETH",
            network: (await ethers.provider.getNetwork()).name,
            chainId: (await ethers.provider.getNetwork()).chainId,
            blockNumber: await ethers.provider.getBlockNumber()
        });

        if (await ethers.provider.getBalance(deployer.address) < rewardPool) {
            console.error("Error: Insufficient balance to cover the reward pool");
            return;
        }

        try {
            // Estimate gas and get current gas price
            const gasEstimate = await prizeManager.createPrize.estimateGas(
                description, rewardPool, strategy, criteriaNames, { value: rewardPool }
            );
            const gasPrice = await ethers.provider.getFeeData();

            console.log("Gas estimate:", gasEstimate.toString());
            console.log("Current gas price:", ethers.formatUnits(gasPrice.gasPrice || 0, "gwei"), "gwei");

            // Create and wait for transaction
            const tx = await prizeManager.createPrize(
                description, rewardPool, strategy, criteriaNames,
                { value: rewardPool, gasLimit: gasEstimate * BigInt(120) / BigInt(100) }
            );
            console.log("Transaction created:", tx.hash);

            const receipt = await tx.wait();
            console.log("Prize created successfully!");

            // Log transaction details
            if (receipt) {
                console.log("Transaction details:", {
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    effectiveGasPrice: ethers.formatUnits(receipt.gasPrice || 0, "gwei") + " gwei"
                });

                const event = receipt.logs.find(
                    (log): log is EventLog => log.fragment?.name === "PrizeCreated"
                );

                if (event && event.args) {
                    const prizeAddress = event.args.prizeAddress;
                    console.log("New Prize Contract:", {
                        address: prizeAddress,
                        explorerUrl: getExplorerUrl(hre.network.name, prizeAddress)
                    });
                } else {
                    console.log("PrizeCreated event not found in the logs");
                }
            }
        } catch (error: any) {
            console.error("Error creating prize:", error.message);
            console.error("Error details:", error);
            if (error.transaction) console.error("Transaction data:", error.transaction);
            if (error.receipt) console.error("Transaction receipt:", error.receipt);
        }
    });