import hre from "hardhat";

export async function getTokensFromFaucet(address: string) {
    if (hre.network.name === "localfhenix") {
        let balance = await hre.ethers.provider.getBalance(address);
        const balanceBefore = balance.toString();
        if (balance < hre.ethers.parseEther("1")) { // heuristic
            await hre.fhenixjs.getFunds(address);
            balance = await hre.ethers.provider.getBalance(address);
            const balanceAfter = balance.toString();
            console.log(`address: ${address}, balance before: ${balanceBefore}, balance after: ${balanceAfter}`);
        }
    }
}