import { createHash } from 'crypto';
import fs, { readFileSync } from 'fs';
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from 'path';
import { Address, createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { fhenixTestnet } from "../chainConfig";

// Helper functions
function getContractHash(contractName: string): string {
  const content = readFileSync(`./contracts/${contractName}.sol`, 'utf8');
  return createHash('md5').update(content).digest('hex').slice(0, 8);
}

async function checkAndGetFunds(publicClient: any, deployer: Address): Promise<boolean> {
  const balance = await publicClient.getBalance({ address: deployer });
  if (balance === 0n) {
    console.log("Account has no funds. Get testnet FHE from https://faucet.fhenix.zone");
    return false;
  }
  return true;
}

async function deployContract(hre: HardhatRuntimeEnvironment, contractName: string, deployer: Address, args: any[] = []) {
  const { deployments } = hre;
  return await deployments.deploy(`${contractName}_${getContractHash(contractName)}`, {
    contract: contractName,
    from: deployer,
    args,
    log: true,
  });
}

async function verifyContract(hre: HardhatRuntimeEnvironment, address: string, contractPath: string) {
  try {
    await hre.run("verify:verify", {
      address,
      contract: contractPath,
    });
    console.log(`${contractPath} verified successfully`);
  } catch (error) {
    console.error(`Error verifying ${contractPath}:`, error);
  }
}

async function generateContractAddresses(network: any, contracts: Record<string, { address: string }>) {
  const contractAddresses = {
    [network.chainId!.toString()]: Object.fromEntries(
      Object.entries(contracts).map(([name, { address }]) => [name, address])
    )
  };

  const contractAddressesPath = path.join(__dirname, '..', 'webapp', 'contract-addresses.json');
  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
  console.log(`Contract addresses written to ${contractAddressesPath}`);
}

async function generateABIFiles(hre: HardhatRuntimeEnvironment, contractNames: string[]) {
  const abiDir = path.join(__dirname, '..', 'webapp', 'abi');
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  for (const contractName of contractNames) {
    const artifact = await hre.artifacts.readArtifact(contractName);
    const abiPath = path.join(abiDir, `${contractName}.json`);
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`${contractName} ABI written to ${abiPath}`);
  }
}

async function isPrizeManagerDeployed(hre: HardhatRuntimeEnvironment, address: string): Promise<boolean> {
  try {
    const publicClient = await hre.viem.getPublicClient({
      chain: fhenixTestnet
    });
    const code = await publicClient.getCode({ address: address as `0x${string}` });
    return code !== undefined && code !== '0x';
  } catch (error) {
    console.error("Error checking PrizeManager deployment:", error);
    return false;
  }
}

// Main deploy function
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = hre.network.config;
  console.log(`Deploying to network: ${hre.network.name} (Chain ID: ${network.chainId})`);

  let publicClient;
  if (hre.network.name === "hardhat") {
    // Use Hardhat's built-in provider for local development
    publicClient = await hre.viem.getPublicClient();
  } else {
    publicClient = createPublicClient({
      chain: {
        id: network.chainId!,
        name: hre.network.name,
        network: hre.network.name,
        nativeCurrency: { name: 'FHE', symbol: 'FHE', decimals: 18 },
        rpcUrls: { default: { http: [network.url!] } },
      },
      transport: http(),
    });
  }

  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
  const walletClient = createWalletClient({
    account,
    chain: publicClient.chain,
    transport: http(),
  });

  console.log(`Deployer address: ${account.address}`);

  if (!(await checkAndGetFunds(publicClient, account.address))) return;

  // Deploy contracts
  const allocationStrategyLinear = await deployContract(hre, "AllocationStrategyLinear", account.address);
  const prizeManager = await deployContract(hre, "PrizeManager", account.address);

  // Verify contracts
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("Verifying contracts...");
    await verifyContract(hre, allocationStrategyLinear.address, "contracts/AllocationStrategyLinear.sol:AllocationStrategyLinear");
    await verifyContract(hre, prizeManager.address, "contracts/PrizeManager.sol:PrizeManager");
  }

  // Check if PrizeManager is a new deployment
  const isPrizeManagerNew = !(await isPrizeManagerDeployed(hre, prizeManager.address));

  if (isPrizeManagerNew) {
    // Set default strategy only for new deployments
    const prizeManagerABI = (await hre.artifacts.readArtifact("PrizeManager")).abi;
    await walletClient.writeContract({
      address: prizeManager.address as `0x${string}`,
      abi: prizeManagerABI,
      functionName: 'updateStrategy',
      args: ["AllocationStrategyLinear", allocationStrategyLinear.address as `0x${string}`],
      chain: publicClient.chain,
    });
    console.log(`Default strategy set to AllocationStrategyLinear: ${allocationStrategyLinear.address}`);
  } else {
    console.log("PrizeManager already deployed. Skipping strategy update.");
  }

  // Generate contract addresses and ABI files
  await generateContractAddresses(network, { PrizeManager: prizeManager, AllocationStrategyLinear: allocationStrategyLinear });
  await generateABIFiles(hre, ["PrizeManager", "PrizeContract", "IAllocationStrategy", "AllocationStrategyLinear"]);
};

export { getContractHash };
export default func;
func.id = "deploy_covalence_prizes";
func.tags = ["CovalencePrizes"];