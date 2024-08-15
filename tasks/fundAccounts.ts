import dotenv from "dotenv";
import { Wallet, parseEther } from "ethers";
import { task } from "hardhat/config";

task("task:fundAccounts", "Fund other accounts with 2 ETH each from the first account")
    .setAction(async (taskArgs, hre) => {
        // Load environment variables from .env.local
        dotenv.config({ path: '.env.local' });

        const provider = hre.ethers.provider;

        // Collect all private keys from environment variables
        const privateKeys = Object.entries(process.env)
            .filter(([key]) => key.startsWith('PRIVATE_KEY'))
            .map(([, value]) => value as string);

        console.log(`Found ${privateKeys.length} private keys in .env.local`);

        if (privateKeys.length < 2) {
            console.log("Not enough accounts to fund. Exiting.");
            return;
        }

        const funderWallet = new Wallet(privateKeys[0], provider);
        console.log(`Funding from account: ${funderWallet.address}`);

        const fundAmount = parseEther("2");

        for (let i = 1; i < privateKeys.length; i++) {
            const recipientWallet = new Wallet(privateKeys[i], provider);

            console.log(`Sending 2 ETH to account ${i + 1}: ${recipientWallet.address}`);

            const tx = await funderWallet.sendTransaction({
                to: recipientWallet.address,
                value: fundAmount
            });

            await tx.wait();
            console.log(`Transaction confirmed: ${tx.hash}`);
        }

        console.log("Funding complete.");
    });