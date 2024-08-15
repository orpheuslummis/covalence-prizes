import { Contract, FunctionFragment } from "ethers";
import * as fs from 'fs';
import { DeployFunction, Deployment } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from 'path';

interface NetworkConfig {
    chainId: number;
    // Add other properties as needed
}

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

interface Selector {
    selector: string;
    name: string;
    facetName: string;  // Add this line
}

function getSelectors(contract: Contract, facetName: string): Selector[] {
    const signatures = Object.values(
        contract.interface.fragments.filter(
            (fragment) => fragment.type === "function"
        )
    ) as FunctionFragment[];

    return signatures.reduce<Selector[]>((acc, val) => {
        if (val.format("sighash") !== "init(bytes)") {
            acc.push({
                selector: val.selector,
                name: val.name,
                facetName: facetName  // Add this line
            });
        }
        return acc;
    }, []);
}

function findDuplicateSelectors(facetCuts: { facetName: string; selectors: Selector[] }[]): { [selector: string]: Selector[] } {
    const selectorMap: { [selector: string]: Selector[] } = {};
    const duplicates: { [selector: string]: Selector[] } = {};

    facetCuts.forEach(({ facetName, selectors }) => {
        selectors.forEach(selector => {
            if (selectorMap[selector.selector]) {
                selectorMap[selector.selector].push({ ...selector, facetName });
                duplicates[selector.selector] = selectorMap[selector.selector];
            } else {
                selectorMap[selector.selector] = [{ ...selector, facetName }];
            }
        });
    });

    return duplicates;
}

function formatDuplicatesMessage(duplicates: { [selector: string]: Selector[] }): string {
    let message = "Duplicate selectors found:\n";
    for (const [selector, selectorInfo] of Object.entries(duplicates)) {
        message += `  Selector ${selector} (${selectorInfo[0].name}) is present in facets:\n`;
        selectorInfo.forEach(info => {
            message += `    - ${info.facetName}\n`;
        });
    }
    return message;
}

// Add this function to get contract size
async function getContractSize(hre: HardhatRuntimeEnvironment, contractName: string): Promise<number> {
    const artifact = await hre.artifacts.readArtifact(contractName);
    return artifact.deployedBytecode.length / 2 - 1; // Convert bytes to size in bytes
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log(`Deploying to network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
    console.log(`Deployer address: ${deployer}`);

    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer);
    console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther("1")) {
        throw new Error("Deployer account has less than 1 ETH. Please fund it before deploying.");
    }

    // Force new deployment by adding a timestamp to the contract name
    const timestamp = Date.now();

    // Helper function to deploy and log size
    async function deployAndLogSize(name: string, contract: string, args: any[] = []) {
        const deployment = await deploy(`${name}_${timestamp}`, {
            from: deployer,
            contract: contract,
            args: args,
            log: true,
        });
        const size = await getContractSize(hre, contract);
        console.log(`${name} deployed at ${deployment.address}`);
        console.log(`${name} size: ${size} bytes`);
        return deployment;
    }

    // Deploy DiamondCutFacet
    const DiamondCutFacet = await deployAndLogSize('DiamondCutFacet', 'DiamondCutFacet');

    // Deploy Diamond
    const Diamond = await deployAndLogSize('Diamond', 'Diamond', [deployer, DiamondCutFacet.address]);

    // Deploy DiamondInit
    const DiamondInit = await deployAndLogSize('DiamondInit', 'DiamondInit');

    // Deploy facets
    console.log('Deploying facets');
    const FacetNames = [
        'DiamondLoupeFacet',
        'PrizeACLFacet',
        'PrizeManagerFacet',
        'PrizeContributionFacet',
        'PrizeRewardFacet',
        'PrizeEvaluationFacet',
        'PrizeStateFacet',
        'PrizeStrategyFacet',
        'PrizeFundingFacet',
        // 'FHETestFacet',
    ];
    const cut = [];
    const facetCuts = [];

    for (const FacetName of FacetNames) {
        const Facet = await deployAndLogSize(FacetName, FacetName);
        const facetContract = await ethers.getContractAt(FacetName, Facet.address);
        const selectors = getSelectors(facetContract, FacetName);  // Pass FacetName here
        cut.push({
            facetAddress: Facet.address,
            action: FacetCutAction.Add,
            functionSelectors: selectors.map(s => s.selector)
        });
        facetCuts.push({ facetName: FacetName, selectors });
        console.log(`${FacetName} selectors:`, selectors.map(s => `${s.selector}: ${s.name}`).join(', '));
    }

    // Check for duplicate selectors
    const duplicates = findDuplicateSelectors(facetCuts);
    if (Object.keys(duplicates).length > 0) {
        console.error(formatDuplicatesMessage(duplicates));
        throw new Error("Duplicate selectors found. Deployment aborted.");
    }

    // Perform diamond cut
    console.log('Performing diamond cut...');
    const diamondCut = await ethers.getContractAt('IDiamondCut', Diamond.address);
    const diamondInit = await ethers.getContractAt('DiamondInit', DiamondInit.address);
    let functionCall = diamondInit.interface.encodeFunctionData('init');

    try {
        const tx = await diamondCut.diamondCut(cut, DiamondInit.address, functionCall);
        console.log('Diamond cut tx: ', tx.hash);
        const receipt = await tx.wait();
        if (receipt === null) {
            throw Error(`Diamond upgrade failed: transaction ${tx.hash} was not mined`);
        }
        if (!receipt.status) {
            throw Error(`Diamond upgrade failed: ${tx.hash}`);
        }
        console.log('Completed diamond cut');
    } catch (error) {
        console.error('Error during diamond cut:', error);
        throw error;
    }

    // Verify Diamond setup
    await verifyDiamond(hre, Diamond.address);

    // Generate contract addresses and ABI files
    await generateContractAddresses(hre.network.config as NetworkConfig, await deployments.all());
    await generateABIFiles(hre, ['Diamond', 'DiamondInit', ...FacetNames]);
};

async function verifyDiamond(hre: HardhatRuntimeEnvironment, diamondAddress: string) {
    const DiamondLoupeFacet = await hre.ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
    const facets = await DiamondLoupeFacet.facets();

    console.log('\nVerifying Diamond Setup:');
    console.log('Diamond Address:', diamondAddress);

    for (const facet of facets) {
        const facetName = await getFacetName(hre, facet.facetAddress);
        // Use the original contract name without timestamp
        const originalFacetName = facetName.split('_')[0];
        const facetContract = await hre.ethers.getContractAt(originalFacetName, facet.facetAddress);
        console.log(`\nFacet: ${originalFacetName}`);
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

async function generateContractAddresses(network: NetworkConfig, deployments: { [name: string]: Deployment }) {
    const latestDeployments: { [key: string]: string } = {};

    // Sort deployments by timestamp (assuming the timestamp is part of the name)
    const sortedDeployments = Object.entries(deployments).sort((a, b) => {
        const timestampA = parseInt(a[0].split('_')[1] || '0');
        const timestampB = parseInt(b[0].split('_')[1] || '0');
        return timestampB - timestampA;
    });

    // Keep only the latest deployment for each contract type
    for (const [name, deployment] of sortedDeployments) {
        const baseName = name.split('_')[0];
        if (!latestDeployments[baseName]) {
            latestDeployments[baseName] = deployment.address;
        }
    }

    const contractAddresses = {
        [network.chainId.toString()]: latestDeployments
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
        // Always use the base contract name without timestamp
        const baseContractName = contractName.split('_')[0];
        const artifact = await hre.artifacts.readArtifact(baseContractName);
        const abiPath = path.join(abiDir, `${baseContractName}.json`);
        fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
        console.log(`${baseContractName} ABI written to ${abiPath}`);
    }
}

export default func;
func.id = "deploy_diamond";
func.tags = ["Diamond"];