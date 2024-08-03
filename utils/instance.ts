import { ethers } from "ethers";
import { FhenixClient, Permission } from "fhenixjs";
import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";

type FhenixHRE = {
  fhenixjs: FhenixClient;
};

type ExtendedFhenixClient = FhenixClient & Partial<HardhatRuntimeEnvironment> & FhenixHRE;

export interface FheInstance {
  instance: ExtendedFhenixClient;
  permission: Permission;
}

export async function createFheInstance(
  hre: any,
  contractAddress: string
): Promise<FheInstance> {
  // console.log("HRE object:", hre);

  if (!hre._networkName) {
    throw new Error("Network name is not available in the provided object");
  }

  const networkName = hre._networkName;
  console.log("Network name:", networkName);

  const provider = hre.provider;
  if (!provider) {
    throw new Error("Provider is not available in the provided object");
  }

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Initialize FhenixClient
  const instance = new FhenixClient({
    provider,
    signer,
  }) as ExtendedFhenixClient;

  const permit = await instance.generatePermit(contractAddress);
  const permission = instance.extractPermitPermission(permit);

  return {
    instance,
    permission,
  };
}