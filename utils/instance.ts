import { ethers } from "ethers";
import { FhenixHardhatRuntimeEnvironment } from "fhenix-hardhat-plugin/src/FhenixHardhatRuntimeEnvironment";
import { FhenixClient, InstanceParams } from "fhenixjs";
import { HardhatRuntimeEnvironment } from "hardhat/types";

type HardhatFhenixClient = FhenixClient & Partial<FhenixHardhatRuntimeEnvironment>;

export async function createFheInstance(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  signer: ethers.Signer
): Promise<FhenixClient> {
  let instance: HardhatFhenixClient;

  if (hre.fhenixjs) {
    instance = hre.fhenixjs as unknown as HardhatFhenixClient;
  } else {
    console.log("fhenixjs not found in HRE, creating a new FhenixClient instance");
    const params: InstanceParams = {
      provider: hre.ethers.provider,
    };
    instance = new FhenixClient(params) as HardhatFhenixClient;
  }

  try {
    await instance.fhePublicKey;
  } catch (error) {
    console.error("Error initializing FHE public key:", error);
    throw error;
  }

  const permit = await instance.generatePermit(contractAddress, hre.ethers.provider, signer);
  instance.storePermit(permit);

  return instance;
}