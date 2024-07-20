import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";

const MINIMUM_BALANCE = ethers.parseEther("1");

export async function ensureAddressesExist(addresses: string[], funder: SignerWithAddress) {
    for (const address of addresses) {
        await ensureSufficientBalance(address, funder);
    }
}

async function ensureSufficientBalance(address: string, funder: SignerWithAddress) {
    const balance = await hre.ethers.provider.getBalance(address);
    if (balance < MINIMUM_BALANCE) {
        console.log(`Funding address ${address} with minimum balance...`);
        await transferTokensIfNeeded(funder, address);
    } else {
        console.log(`Address ${address} already has sufficient balance.`);
    }
}

export async function transferTokensIfNeeded(
    from: SignerWithAddress,
    to: string,
    amount: bigint = MINIMUM_BALANCE,
    maxRetries = 3
) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const balance = await hre.ethers.provider.getBalance(to);
            if (balance < amount) {
                const tx = await from.sendTransaction({ to, value: amount });
                await tx.wait();
                console.log(`Transferred ${ethers.formatEther(amount)} ETH to ${to}`);
            } else {
                console.log(`Account ${to} already has sufficient balance`);
            }
            return;
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed to transfer tokens to ${to}: ${error.message}`);
            if (i === maxRetries - 1) {
                throw new Error(`Failed to transfer tokens after ${maxRetries} attempts`);
            }
        }
    }
}