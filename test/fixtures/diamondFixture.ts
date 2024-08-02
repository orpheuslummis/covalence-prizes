import { deployments } from "hardhat";

export async function diamondFixture() {
    const diamondDeployment = await deployments.get("Diamond");
    const diamond = await ethers.getContractAt("Diamond", diamondDeployment.address);

    // Get facet addresses
    const facetAddresses = await diamond.facetAddresses();
    const facets = await Promise.all(
        facetAddresses.map(async (address) => {
            const facetName = await deployments.getArtifactName(address);
            return { name: facetName, address };
        })
    );

    return { diamond, facets };
}