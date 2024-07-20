import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";

export async function ensureAddressesExist(addresses: string[], funder: SignerWithAddress) {
    const minimumBalance = ethers.parseEther("0.05"); // Minimum balance required

    for (const address of addresses) {
        const balance = await hre.ethers.provider.getBalance(address);
        if (balance < minimumBalance) {
            console.log(`Funding address ${address} with minimum balance...`);
            await transferTokensIfNeeded(funder, address, minimumBalance);
        } else {
            console.log(`Address ${address} already has sufficient balance.`);
        }
    }
}

export async function transferTokensIfNeeded(from: SignerWithAddress | undefined, to: string, minimumBalance: bigint, maxRetries = 3) {
    if (!from) {
        throw new Error(`No 'from' signer provided. Cannot transfer tokens to ${to}`);
    }

    for (let i = 0; i < maxRetries; i++) {
        try {
            const balance = await hre.ethers.provider.getBalance(to);
            if (balance < minimumBalance) {
                const amountToSend = minimumBalance; // Always send the full minimum balance
                const tx = await from.sendTransaction({
                    to: to,
                    value: amountToSend
                });
                await tx.wait();
                console.log(`Transferred ${ethers.formatEther(amountToSend)} ETH to ${to}`);
                return;
            } else {
                console.log(`Account ${to} already has sufficient balance`);
                return;
            }
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed to transfer tokens to ${to}: ${error.message}`);
            if (i === maxRetries - 1) {
                throw new Error(`Failed to transfer tokens after ${maxRetries} attempts`);
            }
        }
    }
}