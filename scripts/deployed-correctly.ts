import { ethers } from "hardhat";
import contractAddresses from '../webapp/contract-addresses.json';

async function main() {
    // Get the network from Hardhat
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();

    // Type assertion for contractAddresses
    const addresses = (contractAddresses as Record<string, { Diamond: string }>)[chainId];

    if (!addresses) {
        throw new Error(`No contract addresses found for chain ID ${chainId}`);
    }

    const diamondAddress = addresses.Diamond;
    console.log("Checking Diamond at address:", diamondAddress);

    const code = await ethers.provider.getCode(diamondAddress);
    if (code === "0x") {
        console.log("No code found at the Diamond address!");
    } else {
        console.log("Code found at the Diamond address. Length:", code.length);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});