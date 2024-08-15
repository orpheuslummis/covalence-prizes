import hre from "hardhat";
import { formatEther, parseEther } from "viem";

async function main() {
    if (!hre.viem) {
        throw new Error("Hardhat Viem plugin is not properly configured");
    }

    const network = hre.network.config;
    if (!network || !('chains' in network) || !network.chains || network.chains.length === 0) {
        throw new Error("Network configuration or chain information is missing");
    }

    const chain = network.chains[0];

    const walletClients = await hre.viem.getWalletClients({ chain });
    console.log(`Number of wallet clients: ${walletClients.length}`);

    if (walletClients.length === 0) {
        throw new Error("No wallet clients available");
    }

    const walletClient = walletClients[0];
    console.log(`Using account: ${walletClient.account.address}`);

    const publicClient = await hre.viem.getPublicClient({ chain });

    const initialBalance = await publicClient.getBalance({
        address: walletClient.account.address,
    });

    console.log(
        `Initial balance of ${walletClient.account.address}: ${formatEther(
            initialBalance
        )} FHE`
    );

    // Send transaction to self
    const amountToSend = parseEther("0.1"); // Sending 0.1 FHE to self
    console.log(`Sending ${formatEther(amountToSend)} FHE to self`);

    const hash = await walletClient.sendTransaction({
        to: walletClient.account.address,
        value: amountToSend,
    });

    console.log(`Transaction sent: ${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Check balance after transaction
    const finalBalance = await publicClient.getBalance({
        address: walletClient.account.address,
    });

    console.log(
        `Final balance of ${walletClient.account.address}: ${formatEther(
            finalBalance
        )} FHE`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("An error occurred:", error);
        process.exit(1);
    });