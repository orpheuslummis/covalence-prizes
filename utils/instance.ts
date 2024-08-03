import type { FhenixClient, Permission } from "fhenixjs";
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
  hre: HardhatRuntimeEnvironment & FhenixHRE,
  contractAddress: string
): Promise<FheInstance> {
  const provider = hre.ethers.provider;
  const signer = await hre.ethers.getSigners();
  const instance = hre.fhenixjs as ExtendedFhenixClient;

  const permit = await instance.generatePermit(contractAddress, provider, signer[0]);
  const permission = instance.extractPermitPermission(permit);

  return {
    instance,
    permission,
  };
}