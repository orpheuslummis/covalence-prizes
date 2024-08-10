import { ethers } from "ethers";
import { FhenixHardhatRuntimeEnvironment } from "fhenix-hardhat-plugin/src/FhenixHardhatRuntimeEnvironment";
import { FhenixClient, InstanceParams, Permission } from "fhenixjs";
import { HardhatRuntimeEnvironment } from "hardhat/types";

type HardhatFhenixClient = FhenixClient & Partial<FhenixHardhatRuntimeEnvironment>;

export interface FheInstance {
  instance: HardhatFhenixClient;
  permission: Permission;
}

export async function createFheInstance(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  signer: ethers.Signer
): Promise<FheInstance> {
  console.log("Creating FHE instance...");
  console.log("Contract address:", contractAddress);

  let instance: HardhatFhenixClient;

  if (hre.fhenixjs) {
    console.log("Using hre.fhenixjs");
    instance = hre.fhenixjs as unknown as HardhatFhenixClient;
  } else {
    console.log("fhenixjs not found in HRE, creating a new FhenixClient instance");
    const params: InstanceParams = {
      provider: hre.ethers.provider,
    };
    instance = new FhenixClient(params) as HardhatFhenixClient;
  }

  console.log("Waiting for FHE public key to be initialized...");
  try {
    await instance.fhePublicKey;
    console.log("FHE public key initialized successfully");
  } catch (error) {
    console.error("Error initializing FHE public key:", error);
    throw error;
  }

  console.log("Generating permit...");
  const permit = await instance.generatePermit(contractAddress, hre.ethers.provider, signer);
  const permission = instance.extractPermitPermission(permit);
  console.log("Permit generated successfully");

  return {
    instance,
    permission,
  };
}