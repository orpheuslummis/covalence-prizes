import { randomBytes } from "crypto";
import { ContractTransactionResponse, EventLog, Signer, TransactionReceipt, TransactionResponse } from "ethers";
import { artifacts, ethers } from "hardhat";
import { Diamond, DiamondLoupeFacet, PrizeACLFacet, PrizeContributionFacet, PrizeEvaluationFacet, PrizeFundingFacet, PrizeManagerFacet, PrizeRewardFacet, PrizeStateFacet, PrizeStrategyFacet } from "../types";
import contractAddresses from "../webapp/contract-addresses.json";

type ContractAddresses = {
    [chainId: string]: {
        [contractName: string]: string;
    };
};

const typedContractAddresses = contractAddresses as ContractAddresses;

export const TEST_PRIZE_AMOUNT = ethers.parseEther("0.001");
export const DEFAULT_TEST_SEED = "testSeed123";
export const CRITERIA_OPTIONS = ["Quality", "Creativity", "Innovation", "Feasibility", "Impact", "Originality"];

export const FACET_NAMES = [
    "DiamondCutFacet",
    "DiamondLoupeFacet",
    "PrizeManagerFacet",
    "PrizeACLFacet",
    "PrizeContributionFacet",
    "PrizeEvaluationFacet",
    "PrizeRewardFacet",
    "PrizeStateFacet",
    "PrizeStrategyFacet",
    "PrizeFundingFacet",
    // "FHETestFacet"
];

export enum AllocationStrategy {
    Linear = 0,
    Quadratic = 1,
    WinnerTakesAll = 2,
    Invalid = 3
}

export enum PrizeState {
    Setup = 0,
    Open = 1,
    Evaluating = 2,
    Allocating = 3,
    Claiming = 4,
    Closed = 5
}

export interface PrizeParams {
    name: string;
    description: string;
    pool: bigint;
    criteria: string[];
    criteriaWeights: number[];
    strategy: AllocationStrategy;
}

export type DiamondWithFacets = Diamond & {
    [K in keyof (DiamondLoupeFacet & PrizeManagerFacet & PrizeFundingFacet & PrizeACLFacet & PrizeContributionFacet & PrizeEvaluationFacet & PrizeRewardFacet & PrizeStateFacet & PrizeStrategyFacet)]: (DiamondLoupeFacet & PrizeManagerFacet & PrizeFundingFacet & PrizeACLFacet & PrizeContributionFacet & PrizeEvaluationFacet & PrizeRewardFacet & PrizeStateFacet & PrizeStrategyFacet)[K]
};

export function generateUniqueId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function generateRandomPrizeParams(seed: string = DEFAULT_TEST_SEED): PrizeParams {
    const rng = randomBytes(32);
    rng.write(seed);

    const criteriaCount = 3 + (rng[0] % 2); // 3 to 4 criteria
    const criteria = Array.from({ length: criteriaCount }, () => CRITERIA_OPTIONS[Math.floor(Math.random() * CRITERIA_OPTIONS.length)]);
    const criteriaWeights = Array.from({ length: criteriaCount }, () => Math.floor(Math.random() * 10) + 1);

    const uniqueId = generateUniqueId();
    const pool = ethers.parseEther((0.0001).toString());

    return {
        name: `Prize ${seed}_${uniqueId}`,
        description: `This is a test prize with seed ${seed} and unique ID ${uniqueId}`,
        pool,
        criteria,
        criteriaWeights,
        strategy: AllocationStrategy.Linear // Default to Linear
    };
}

export async function extractPrizeIdFromTx(tx: ContractTransactionResponse): Promise<bigint> {
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction receipt not found");

    const createEvent = receipt.logs.find(
        log => log != null && log instanceof EventLog && 'eventName' in log && log.eventName === 'PrizeCreated'
    ) as EventLog | undefined;

    if (!createEvent) throw new Error("PrizeCreated event not found in receipt");

    const args = createEvent.args;
    if (!args || args.length < 2) throw new Error("PrizeCreated event has unexpected arguments");

    const newPrizeId = args[1];
    if (newPrizeId == null) throw new Error("Prize ID is null or undefined");

    return BigInt(newPrizeId.toString());
}

export async function connectDiamond(signer: Signer): Promise<DiamondWithFacets> {
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();
    const addresses = typedContractAddresses[chainId];

    if (!addresses) {
        throw new Error(`No contract addresses found for chain ID ${chainId}`);
    }

    const diamondAddress = addresses.Diamond;

    // Combine ABIs of all facets
    const combinedABI = FACET_NAMES.reduce((acc: any[], facetName) => {
        const facetArtifact = artifacts.readArtifactSync(facetName);
        return acc.concat(facetArtifact.abi);
    }, []);

    const contract = await ethers.getContractAt(combinedABI, diamondAddress, signer);
    return contract as unknown as DiamondWithFacets;
}

export async function getFacetName(diamondLoupeFacet: DiamondLoupeFacet, facetAddress: string): Promise<string> {
    const facetFunctionSelectors = await diamondLoupeFacet.facetFunctionSelectors(facetAddress);
    if (facetFunctionSelectors.length === 0) {
        return "Not a Facet";
    }

    for (const name of FACET_NAMES) {
        try {
            const contract = await ethers.getContractAt(name, facetAddress);
            const selector = facetFunctionSelectors[0];
            if (contract.interface.getFunction(selector)) {
                return name;
            }
        } catch (error) {
            console.log(`Error matching ${name} to ${facetAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    console.log(`Unable to match any known facet to address ${facetAddress}`);
    console.log(`Function selectors for this facet: ${facetFunctionSelectors.join(', ')}`);
    return "Unknown Facet";
}

export async function getFunctionName(selector: string): Promise<string> {
    for (const name of FACET_NAMES) {
        try {
            const factory = await ethers.getContractFactory(name);
            const abi = factory.interface.fragments;
            const fragment = abi.find((f) => f.type === "function" && ethers.id(f.format()).slice(0, 10) === selector);
            if (fragment && 'name' in fragment) {
                return fragment.name as string;
            }
        } catch (error) {
            // Contract factory not found or error in processing, continue to next
        }
    }
    return "Unknown Function";
}

export async function logTransaction(contract: DiamondWithFacets, tx: TransactionResponse, operation: string): Promise<TransactionReceipt | undefined> {
    console.log(`\nTXN: ${operation} (${tx.hash})`);
    const receipt = await tx.wait();
    if (receipt) {
        console.log(`Block: ${receipt.blockNumber} | Gas Used: ${receipt.gasUsed.toString()}`);
        if (receipt.logs) {
            for (const log of receipt.logs) {
                try {
                    const parsedLog = contract.interface.parseLog({
                        topics: log.topics as string[],
                        data: log.data
                    });
                    if (parsedLog) {
                        const args = Object.entries(parsedLog.args)
                            .filter(([key]) => isNaN(Number(key)))
                            .map(([key, value]) => `${key}: ${formatLogValue(value)}`)
                            .join(', ');
                        console.log(`Event: ${parsedLog.name}(${args})`);
                    }
                } catch (error) {
                    // Silently ignore decoding errors
                }
            }
        }
        return receipt;
    } else {
        console.log(`${operation} - Receipt not available`);
        return undefined;
    }
}

function formatLogValue(value: any): string {
    if (typeof value === 'bigint') {
        return value.toString();
    } else if (Array.isArray(value)) {
        return `[${value.map(formatLogValue).join(', ')}]`;
    } else if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    return String(value);
}