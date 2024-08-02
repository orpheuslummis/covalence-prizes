import { keccak256 } from 'ethers';
import fs from 'fs';
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from 'path';
import { encodeFunctionData } from 'viem';

function getSelector(functionSignature: string): string {
    return keccak256(Buffer.from(functionSignature, 'utf-8')).substring(0, 10); // First 4 bytes (8 hex characters) with '0x' prefix
}

export enum FacetCutAction {
    Add,
    Replace,
    Remove
}

function getSelectors(hre: HardhatRuntimeEnvironment, abi: any[], facetName: string): { selectors: string[], selectorToFuncMap: { [key: string]: string } } {
    const selectors = new Set<string>();
    const selectorToFuncMap: { [key: string]: string } = {};

    console.log(`Processing ABI for facet: ${facetName}`);
    // console.log(`ABI: ${JSON.stringify(abi, null, 2)}`);

    abi
        .filter(item => item.type === 'function')
        .forEach(item => {
            const functionSignature = `${item.name}(${item.inputs.map(input => input.type).join(',')})`;
            console.log(`Generated function signature: ${functionSignature}`);

            try {
                const selector = getSelector(functionSignature);
                console.log(`Function Signature: ${functionSignature}, Selector: ${selector}`);

                if (selectors.has(selector)) {
                    console.warn(`Duplicate selector found: ${selector} for function ${functionSignature} in ${facetName}`);
                } else {
                    selectors.add(selector);
                    selectorToFuncMap[selector] = functionSignature;
                }
            } catch (error) {
                console.error(`Error generating selector for function signature: ${functionSignature}`, error);
            }
        });

    console.log(`Selectors for ${facetName}:`, Array.from(selectors));
    console.log(`Selector to Function Map for ${facetName}:`, selectorToFuncMap);
    return { selectors: Array.from(selectors), selectorToFuncMap };
}

async function checkAndGetFunds(hre: HardhatRuntimeEnvironment, deployer: `0x${string}`): Promise<boolean> {
    if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
        return true; // Always return true for local networks
    }
    const publicClient = await hre.viem.getPublicClient();
    const balance = await publicClient.getBalance({ address: deployer });
    if (balance === 0n) {
        console.log("Account has no funds. Get testnet FHE from https://faucet.fhenix.zone");
        return false;
    }
    return true;
}

async function generateContractAddresses(network: any, contracts: Record<string, { address: string }>) {
    const contractAddresses = {
        [network.chainId!.toString()]: Object.fromEntries(
            Object.entries(contracts).map(([name, { address }]) => [name, address])
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

async function deployFacetsAndPerformCut(hre: HardhatRuntimeEnvironment, deployer: `0x${string}`) {
    const { deployments } = hre;
    const { deploy } = deployments;

    // Deploy facets
    const facetNames = ['DiamondLoupeFacet', 'OwnershipFacet', 'PrizeManagerFacet', 'PrizeCoreFacet', 'PrizeContributionFacet', 'PrizeRewardFacet'];
    const cut = [];
    const allSelectors: { [key: string]: { facetName: string, functionSignature: string }[] } = {};
    const duplicateSelectors: { [key: string]: { facetName: string, functionSignature: string }[] } = {};

    for (const facetName of facetNames) {
        const facet = await deploy(facetName, { from: deployer, log: true });
        const artifact = await hre.artifacts.readArtifact(facetName);
        const { selectors, selectorToFuncMap } = getSelectors(hre, artifact.abi, facetName);
        console.log(`Selectors for ${facetName}:`, selectors);
        console.log(`Selector to Function Map for ${facetName}:`, selectorToFuncMap);

        // Check for duplicate selectors across all facets
        selectors.forEach(selector => {
            if (!allSelectors[selector]) {
                allSelectors[selector] = [];
            }
            allSelectors[selector].push({ facetName, functionSignature: selectorToFuncMap[selector] });

            if (allSelectors[selector].length > 1) {
                if (!duplicateSelectors[selector]) {
                    duplicateSelectors[selector] = allSelectors[selector];
                }
            }
        });

        if (selectors.length > 0) {
            cut.push({
                facetAddress: facet.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            });
            console.log(`Added ${facetName} to cut with ${selectors.length} selectors`);
        } else {
            console.warn(`No valid selectors found for ${facetName}`);
        }
    }

    // Log duplicate selectors
    if (Object.keys(duplicateSelectors).length > 0) {
        console.log('\nDuplicate Selectors Found:');
        for (const [selector, duplicates] of Object.entries(duplicateSelectors)) {
            console.log(`\nSelector ${selector} is duplicated in:`);
            duplicates.forEach(({ facetName, functionSignature }) => {
                console.log(`  - ${facetName}: ${functionSignature}`);
            });
        }
        console.warn('\nWARNING: Duplicate selectors detected. This may cause issues in the diamond cut.');
    } else {
        console.log('\nNo duplicate selectors found.');
    }

    // Perform the diamond cut
    await performDiamondCut(hre, deployer, cut);
}

async function performDiamondCut(hre: HardhatRuntimeEnvironment, deployer: `0x${string}`, cut: any[]) {
    const { deployments } = hre;
    const { deploy } = deployments;

    const diamond = await deploy('Diamond', { from: deployer, log: true });
    const diamondInit = await deploy('DiamondInit', { from: deployer, log: true });
    const diamondCutFacet = await deploy('DiamondCutFacet', { from: deployer, log: true });

    const diamondCutAbi = (await hre.artifacts.readArtifact('IDiamondCut')).abi;
    const diamondInitAbi = (await hre.artifacts.readArtifact('DiamondInit')).abi;

    const initFunction = diamondInitAbi.find(item => item.type === 'function' && item.name === 'init');
    const functionCall = initFunction ? encodeFunctionData({ abi: [initFunction], functionName: 'init', args: [] }) : '0x';

    const publicClient = await hre.viem.getPublicClient();
    const walletClient = await hre.viem.getWalletClient(deployer);

    try {
        const { request } = await publicClient.simulateContract({
            address: diamond.address as `0x${string}`,
            abi: diamondCutAbi,
            functionName: 'diamondCut',
            args: [cut, diamondInit.address, functionCall],
        });

        console.log('Simulation successful. Request:', request);

        const hash = await walletClient.writeContract(request);
        console.log('Transaction hash:', hash);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
            throw new Error(`Diamond upgrade failed: ${hash}`);
        }
        console.log('Completed diamond cut');
    } catch (error) {
        console.error('Error during diamond cut:', error);
        throw error;
    }
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log(`Deploying to network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
    console.log(`Deployer address: ${deployer}`);

    if (!(await checkAndGetFunds(hre, deployer as `0x${string}`))) return;

    // Deploy DiamondCutFacet
    const diamondCutFacet = await deploy('DiamondCutFacet', {
        from: deployer,
        log: true,
    });

    // Deploy Diamond
    const diamond = await deploy('Diamond', {
        from: deployer,
        args: [deployer, diamondCutFacet.address],
        log: true,
    });

    // Deploy DiamondInit
    const diamondInit = await deploy('DiamondInit', {
        from: deployer,
        log: true,
    });

    // Deploy facets
    console.log('Deploying facets');
    const FacetNames = ['DiamondLoupeFacet', 'OwnershipFacet', 'PrizeManagerFacet', 'PrizeCoreFacet', 'PrizeContributionFacet', 'PrizeRewardFacet'];
    const cut = [];
    for (const FacetName of FacetNames) {
        console.log(`\nProcessing ${FacetName}:`);
        const facet = await deploy(FacetName, {
            from: deployer,
            log: true,
        });
        const artifact = await hre.artifacts.readArtifact(FacetName);
        const { selectors, selectorToFuncMap } = getSelectors(hre, artifact.abi, FacetName);
        console.log(`Found ${selectors.length} selectors for ${FacetName}:`, selectors);
        if (selectors.length > 0) {
            cut.push({
                facetAddress: facet.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            });
            console.log(`Added ${FacetName} to cut with ${selectors.length} selectors`);
        } else {
            console.warn(`No valid selectors found for ${FacetName}`);
        }
    }

    console.log('\nFinal Diamond Cut:');
    cut.forEach((facetCut, index) => {
        console.log(`Facet ${index + 1}:`);
        console.log(`  Address: ${facetCut.facetAddress}`);
        console.log(`  Action: ${FacetCutAction[facetCut.action]}`);
        console.log(`  Selectors: ${facetCut.functionSelectors.join(', ')}`);
    });

    // Upgrade diamond with facets
    console.log('Diamond Cut:', JSON.stringify(cut, null, 2));
    const publicClient = await hre.viem.getPublicClient();
    const walletClient = await hre.viem.getWalletClient(deployer as `0x${string}`);
    const diamondCutAbi = (await hre.artifacts.readArtifact('IDiamondCut')).abi;
    const diamondInitAbi = (await hre.artifacts.readArtifact('DiamondInit')).abi;

    const initFunction = diamondInitAbi.find(item => item.type === 'function' && item.name === 'init');
    console.log('Init Function:', initFunction);

    let functionCall = '0x';
    if (initFunction) {
        functionCall = encodeFunctionData({
            abi: [initFunction],
            functionName: 'init',
            args: []
        });
    }
    console.log('Function Call:', functionCall);

    if (cut.length === 0) {
        console.warn('No facets to cut. Skipping diamond cut.');
        return;
    }

    try {
        const { request } = await publicClient.simulateContract({
            address: diamond.address as `0x${string}`,
            abi: diamondCutAbi,
            functionName: 'diamondCut',
            args: [cut, diamondInit.address, functionCall],
        });

        console.log('Simulation successful. Request:', request);

        const hash = await walletClient.writeContract(request);
        console.log('Transaction hash:', hash);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
            throw Error(`Diamond upgrade failed: ${hash}`);
        }
        console.log('Completed diamond cut');
    } catch (error) {
        console.error('Error during diamond cut:', error);
        throw error;
    }

    // Verify contracts
    if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
        console.log("Verifying contracts...");
        try {
            await hre.run("verify:verify", {
                address: diamond.address,
                constructorArguments: [deployer, diamondCutFacet.address],
            });
            console.log("Diamond contract verified successfully");
        } catch (error) {
            console.error("Error verifying Diamond contract:", error);
        }
        // Verify other contracts (facets, DiamondInit) here
    }

    // Generate contract addresses and ABI files
    const contracts = {
        Diamond: diamond,
        DiamondCutFacet: diamondCutFacet,
        DiamondInit: diamondInit,
        ...Object.fromEntries(FacetNames.map(name => [name, deployments.get(name)]))
    };
    await generateContractAddresses(hre.network.config, contracts);
    await generateABIFiles(hre, ['Diamond', 'DiamondCutFacet', 'DiamondInit', ...FacetNames]);
};

export default func;
func.id = "deploy_diamond";
func.tags = ["Diamond"];