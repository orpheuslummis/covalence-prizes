import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

function getContractHash(contractName: string): string {
  const content = readFileSync(`./contracts/${contractName}.sol`, 'utf8');
  return createHash('md5').update(content).digest('hex').slice(0, 8);
}

async function checkAndGetFunds(hre: HardhatRuntimeEnvironment, deployer: any) {
  if ((await hre.ethers.provider.getBalance(deployer.address)).toString() === "0") {
    if (hre.network.name === "localfhenix") {
      await hre.fhenixjs.getFunds(deployer.address);
    } else {
      console.log("Account has no funds. Get testnet FHE from https://faucet.fhenix.zone");
      return false;
    }
  }
  return true;
}

async function deployContract(deployments: any, contractName: string, deployer: any, args: any[] = []) {
  return await deployments.deploy(`${contractName}_${getContractHash(contractName)}`, {
    contract: contractName,
    from: deployer.address,
    args,
    log: true,
  });
}

async function verifyContracts(hre: HardhatRuntimeEnvironment, contracts: { address: string, constructorArguments: any[] }[]) {
  if (hre.network.name === "testnet") {
    await Promise.all(
      contracts.map(contract =>
        hre.run("verify:verify", contract).catch(console.error)
      )
    );
  }
}

async function logDeployment(contractName: string, address: string) {
  console.log(`\n${contractName} deployed:`);
  console.log(`  Address: ${address}`);
  console.log(`  Explorer: https://explorer.helium.fhenix.zone/address/${address}`);
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const [deployer] = await ethers.getSigners();

  if (!(await checkAndGetFunds(hre, deployer))) return;

  const strategyRegistry = await deployContract(deployments, "StrategyRegistry", deployer);
  const allocationStrategyLinear = await deployContract(deployments, "AllocationStrategyLinear", deployer);

  const strategyRegistryContract = await ethers.getContractAt("StrategyRegistry", strategyRegistry.address);
  const strategyName = "AllocationStrategyLinear";
  const existingStrategyAddress = await strategyRegistryContract.getStrategyAddress(strategyName);

  if (existingStrategyAddress !== allocationStrategyLinear.address) {
    await strategyRegistryContract.setStrategyAddress(strategyName, allocationStrategyLinear.address);
  }

  const prizeManager = await deployContract(deployments, "PrizeManager", deployer, [strategyRegistry.address]);

  await verifyContracts(hre, [
    { address: strategyRegistry.address, constructorArguments: [] },
    { address: allocationStrategyLinear.address, constructorArguments: [] },
    { address: prizeManager.address, constructorArguments: [strategyRegistry.address] },
  ]);

  console.log("\n--- Deployment Summary ---");
  await logDeployment("StrategyRegistry", strategyRegistry.address);
  await logDeployment("AllocationStrategyLinear", allocationStrategyLinear.address);
  await logDeployment("PrizeManager", prizeManager.address);
};

export { getContractHash };
export default func;
func.id = "deploy_covalence_prizes";
func.tags = ["CovalencePrizes"];