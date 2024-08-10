import dotenv from "dotenv";
import { Wallet, formatEther } from "ethers";
import { task } from "hardhat/config";

task("task:showBalances", "Show balances of accounts from .env.local")
    .setAction(async (taskArgs, hre) => {
        // Load environment variables from .env.local
        dotenv.config({ path: '.env.local' });

        const provider = hre.ethers.provider;

        // Collect all private keys from environment variables
        const privateKeys = Object.entries(process.env)
            .filter(([key]) => key.startsWith('PRIVATE_KEY'))
            .map(([, value]) => value as string);

        console.log(`Found ${privateKeys.length} private keys in .env.local`);

        for (let i = 0; i < privateKeys.length; i++) {
            const wallet = new Wallet(privateKeys[i], provider);
            const balance = await provider.getBalance(wallet.address);

            console.log(`Account ${i + 1}:`);
            console.log(`Address: ${wallet.address}`);
            console.log(`Balance: ${formatEther(balance)} ETH`);
            console.log('');
        }
    });