import { Contract, FunctionFragment } from "ethers";
import * as fs from 'fs';
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from 'path';

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

function getSelectors(contract: Contract): { selector: string; name: string }[] {
    const signatures = Object.values(
        contract.interface.fragments.filter(
            (fragment) => fragment.type === "function"
        )
    ) as FunctionFragment[];

    return signatures.reduce<{ selector: string; name: string }[]>((acc, val) => {
        if (val.format("sighash") !== "init(bytes)") {
            acc.push({
                selector: val.selector,
                name: val.name
            });
        }
        return acc;
    }, []);
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log(`Deploying to network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
    console.log(`Deployer address: ${deployer}`);

    // Deploy DiamondCutFacet
    const DiamondCutFacet = await deploy('DiamondCutFacet', {
        from: deployer,
        log: true,
    });
    console.log('DiamondCutFacet deployed:', DiamondCutFacet.address);

    // Deploy Diamond
    const Diamond = await deploy('Diamond', {
        from: deployer,
        args: [deployer, DiamondCutFacet.address],
        log: true,
    });
    console.log('Diamond deployed:', Diamond.address);

    // Deploy DiamondInit
    const DiamondInit = await deploy('DiamondInit', {
        from: deployer,
        log: true,
    });
    console.log('DiamondInit deployed:', DiamondInit.address);

    // Deploy facets
    console.log('Deploying facets');
    const FacetNames = [
        'DiamondLoupeFacet',
        'PrizeManagerFacet',
        'PrizeCoreFacet',
        'PrizeContributionFacet',
        'PrizeRewardFacet',
        'PrizeEvaluationFacet'
    ];
    const cut = [];
    for (const FacetName of FacetNames) {
        const Facet = await deploy(FacetName, {
            from: deployer,
            log: true,
        });
        console.log(`${FacetName} deployed: ${Facet.address}`);
        const facetContract = await ethers.getContractAt(FacetName, Facet.address);
        const selectors = getSelectors(facetContract);
        cut.push({
            facetAddress: Facet.address,
            action: FacetCutAction.Add,
            functionSelectors: selectors.map(s => s.selector)
        });
        console.log(`${FacetName} selectors:`);
        selectors.forEach(s => console.log(`  ${s.selector}: ${s.name}`));
    }

    // Upgrade diamond with facets
    console.log('Diamond Cut:');
    cut.forEach((facetCut, index) => {
        console.log(`Facet ${index + 1}: ${FacetNames[index]}`);
        console.log(`  Address: ${facetCut.facetAddress}`);
        console.log('  Function Selectors:');
        facetCut.functionSelectors.forEach(async selector => {
            const selectorInfo = getSelectors(await ethers.getContractAt(FacetNames[index], facetCut.facetAddress))
                .find(s => s.selector === selector);
            console.log(`    ${selector}: ${selectorInfo ? selectorInfo.name : 'Unknown'}`);
        });
    });
    const diamondCut = await ethers.getContractAt('IDiamondCut', Diamond.address);

    // Create DiamondInit call
    const diamondInit = await ethers.getContractAt('DiamondInit', DiamondInit.address);
    let functionCall = diamondInit.interface.encodeFunctionData('init');

    // Perform diamond cut
    const tx = await diamondCut.diamondCut(cut, DiamondInit.address, functionCall);
    console.log('Diamond cut tx: ', tx.hash);
    const receipt = await tx.wait();
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    console.log('Completed diamond cut');

    // Verify Diamond setup
    await verifyDiamond(hre, Diamond.address);

    // Generate contract addresses and ABI files
    await generateContractAddresses(hre.network.config, deployments);
    await generateABIFiles(hre, ['Diamond', 'DiamondInit', ...FacetNames]);
};

async function verifyDiamond(hre: HardhatRuntimeEnvironment, diamondAddress: string) {
    const DiamondLoupeFacet = await hre.ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
    const facets = await DiamondLoupeFacet.facets();

    console.log('\nVerifying Diamond Setup:');
    console.log('Diamond Address:', diamondAddress);

    for (const facet of facets) {
        const facetName = await getFacetName(hre, facet.facetAddress);
        const facetContract = await hre.ethers.getContractAt(facetName, facet.facetAddress);
        console.log(`\nFacet: ${facetName}`);
        console.log(`Address: ${facet.facetAddress}`);
        console.log('Function Selectors:');
        for (const selector of facet.functionSelectors) {
            const functionFragment = facetContract.interface.getFunction(selector);
            const functionName = functionFragment ? functionFragment.name : 'Unknown';
            console.log(`  ${selector}: ${functionName}`);
        }
    }
}

async function getFacetName(hre: HardhatRuntimeEnvironment, facetAddress: string): Promise<string> {
    const deployments = await hre.deployments.all();
    for (const [name, deployment] of Object.entries(deployments)) {
        if (deployment.address.toLowerCase() === facetAddress.toLowerCase()) {
            return name;
        }
    }
    return "Unknown Facet";
}

async function generateContractAddresses(network: any, deployments: any) {
    const contractAddresses = {
        [network.chainId!.toString()]: Object.fromEntries(
            Object.entries(await deployments.all()).map(([name, deployment]) => [name, deployment.address])
        )
    };

    const contractAddressesPath = path.join(__dirname, '..', 'webapp', 'contract-addresses.json');
    fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
    console.log(`Contract addresses written to ${contractAddressesPath}`);
}

async function generateABIFiles(hre: HardhatRuntimeEnvironment, contractNames: string[]) {
    const abiDir = path.join(__dirname, '..', 'webapp', 'abi');
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
    }

    for (const contractName of contractNames) {
        const artifact = await hre.artifacts.readArtifact(contractName);
        const abiPath = path.join(abiDir, `${contractName}.json`);
        fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
        console.log(`${contractName} ABI written to ${abiPath}`);
    }
}

export default func;
func.id = "deploy_diamond";
func.tags = ["Diamond"];