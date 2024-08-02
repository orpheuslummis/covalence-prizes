import { BaseContract } from "ethers";
import { deployments, ethers } from "hardhat";

export async function diamondFixture() {
    await deployments.fixture(["Diamond"]);

    const Diamond = await ethers.getContractFactory("Diamond");
    const diamondDeployment = await deployments.get("Diamond");
    const diamond = Diamond.attach(diamondDeployment.address);

    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacetDeployment = await deployments.get("DiamondCutFacet");
    const diamondCutFacet = DiamondCutFacet.attach(diamondCutFacetDeployment.address);

    const DiamondInit = await ethers.getContractFactory("DiamondInit");
    const diamondInitDeployment = await deployments.get("DiamondInit");
    const diamondInit = DiamondInit.attach(diamondInitDeployment.address);

    const FacetNames = [
        'DiamondLoupeFacet',
        'OwnershipFacet',
        'PrizeManagerFacet',
        'PrizeCoreFacet',
        'PrizeContributionFacet',
        'PrizeRewardFacet'
    ];
    const facets: { [key: string]: BaseContract } = {};

    for (const FacetName of FacetNames) {
        const Facet = await ethers.getContractFactory(FacetName);
        const facetDeployment = await deployments.get(FacetName);
        facets[FacetName] = Facet.attach(facetDeployment.address) as BaseContract;
    }

    return {
        diamond,
        diamondCutFacet,
        diamondInit,
        facets
    };
}