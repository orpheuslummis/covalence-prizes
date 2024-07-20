import dotenv from "dotenv";
import { Wallet } from "ethers";
import fs from "fs";
import { task } from "hardhat/config";

task("task:generateAccounts")
    .addParam("count", "Number of accounts to generate", "5")
    .addOptionalParam("funder", "Address of the account funding the new accounts")
    .setAction(async (taskArgs, hre) => {
        const count = parseInt(taskArgs.count);
        let funder = taskArgs.funder;
        let envContent = '';

        dotenv.config();

        if (!funder) {
            if (!process.env.KEY) {
                console.log('No funder address provided and KEY not found in .env file.');
                return;
            }
            funder = new Wallet(process.env.KEY).address;
        }

        if (process.env.PRIVATE_KEY_1 && process.env.ADDRESS_1) {
            console.log('Accounts are already generated in .env file.');
            return;
        }

        const funderBalance = await hre.ethers.provider.getBalance(funder);
        const requiredBalance = hre.ethers.parseEther("0.1") * BigInt(count);

        if (funderBalance < requiredBalance) {
            console.log(`Funder account ${funder} does not have enough balance.`);
            console.log(`Required: ${hre.ethers.formatEther(requiredBalance)} ETH`);
            console.log(`Available: ${hre.ethers.formatEther(funderBalance)} ETH`);
            return;
        }

        console.log(`Generating ${count} Ethereum accounts...`);

        for (let i = 1; i <= count; i++) {
            const wallet = Wallet.createRandom();
            console.log(`Account ${i}:`);
            console.log(`Address: ${wallet.address}`);
            console.log(`Private Key: ${wallet.privateKey}`);
            console.log('');

            envContent += `PRIVATE_KEY_${i}=${wallet.privateKey}\n`;
            envContent += `ADDRESS_${i}=${wallet.address}\n`;

            const signer = await hre.ethers.provider.getSigner(funder);
            const tx = await signer.sendTransaction({
                to: wallet.address,
                value: hre.ethers.parseEther("0.1")
            });
            await tx.wait();
            console.log(`Funded account ${i} with 0.1 ETH`);
        }

        try {
            fs.appendFileSync('.env', envContent);
            console.log('Accounts generated, funded, and added to .env file.');
        } catch (error) {
            console.error('Error writing to .env file:', error);
        }
    });