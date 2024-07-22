import { ethers } from 'ethers';
import { useCallback, useState } from 'react';
import { useError } from '../ErrorContext';
import { Prize, PrizeStatus } from '../types';
import { useWeb3 } from './useWeb3';

export const usePrizeManager = () => {
    const web3 = useWeb3();
    const { handleError, error, clearError } = useError();
    const [loading, setLoading] = useState(false);
    const [prizes, setPrizes] = useState<Prize[]>([]);

    const getContract = useCallback(async (prizeAddress?: string) => {
        if (!web3 || !web3.isConnected || !web3.provider || !web3.contracts) {
            throw new Error("Web3 is not fully initialized");
        }
        const signer = await web3.provider.getSigner();
        const contractInfo = prizeAddress
            ? { address: prizeAddress, abi: web3.contracts.PrizeManager.abi }
            : web3.contracts.PrizeManager;

        // Ensure the address is a valid Ethereum address
        if (!ethers.isAddress(contractInfo.address)) {
            throw new Error(`Invalid contract address: ${contractInfo.address}`);
        }

        return new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
    }, [web3]);

    const handleContractInteraction = useCallback(async <T>(
        interaction: (contract: ethers.Contract) => Promise<T>,
        errorMessage: string,
        prizeAddress?: string
    ): Promise<T | null> => {
        setLoading(true);
        clearError();
        try {
            const contract = await getContract(prizeAddress);
            return await interaction(contract);
        } catch (err) {
            if (err instanceof Error) {
                handleError(`${errorMessage}: ${err.message}`, err);
            } else {
                handleError(errorMessage, new Error('An unknown error occurred'));
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, [getContract, handleError, clearError]);

    const getAllPrizes = useCallback(async () => {
        const result = await handleContractInteraction(async (contract) => {
            if (!web3 || !web3.isInitialized || !contract) {
                throw new Error('Web3 is not fully initialized');
            }
            try {
                const prizes = await contract.getPrizes();
                return prizes.map((prize: any) => ({
                    id: prize.id.toString(),
                    name: prize.name,
                    description: prize.description,
                    amount: ethers.formatEther(prize.amount),
                    active: prize.active,
                    claimed: prize.claimed,
                    contributions: prize.contributions ? prize.contributions.map((contribution: any) => ({
                        id: contribution.id.toString(),
                        description: contribution.description,
                        score: contribution.score ? contribution.score.toString() : '0',
                    })) : [],
                }));
            } catch (error) {
                console.error('Error fetching prizes:', error);
                throw error;
            }
        }, 'Failed to fetch prizes');

        if (result) {
            setPrizes(result);
        }
        return result || [];
    }, [handleContractInteraction]);

    const createPrize = useCallback(async (name: string, description: string, totalRewardPool: string, allocationStrategy: string, criteriaNames: string[]) => {
        return handleContractInteraction(async (contract) => {
            const tx = await contract.createPrize(
                name,
                description,
                ethers.parseEther(totalRewardPool),
                allocationStrategy,
                criteriaNames,
                { value: ethers.parseEther(totalRewardPool) }
            );
            await tx.wait();
            const newPrize = await contract.allPrizes(await contract.allPrizes.length - 1);
            const state = await contract.getPrizeState(newPrize.prizeAddress);
            const createdPrize = {
                ...newPrize,
                state: PrizeStatus[state as keyof typeof PrizeStatus],
                id: await contract.allPrizes.length - 1
            };
            setPrizes(prevPrizes => [...prevPrizes, createdPrize]);
            return createdPrize;
        }, 'Failed to create prize');
    }, [handleContractInteraction, setPrizes]);

    const getContributions = useCallback(async (prizeId: number) => {
        return handleContractInteraction(async (contract) => {
            const contributionCount = await contract.getContestantCount();
            return Promise.all(
                Array.from({ length: contributionCount }, async (_, i) => {
                    const contributionData = await contract.contributions(i);
                    return {
                        id: i,
                        description: contributionData.description,
                        contestant: contributionData.contestant
                    };
                })
            );
        }, 'Failed to fetch contributions', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const submitContribution = useCallback(async (prizeId: number, contribution: string) => {
        return handleContractInteraction(async (contract) => {
            await contract.submitContribution(contribution);
        }, 'Failed to submit contribution', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const claimReward = useCallback(async (prizeId: number) => {
        return handleContractInteraction(async (contract) => {
            const tx = await contract.claimReward();
            await tx.wait();
        }, 'Failed to claim reward', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const addEvaluators = useCallback(async (prizeId: number, evaluators: string[]) => {
        return handleContractInteraction(async (contract) => {
            await contract.addEvaluators(evaluators);
        }, 'Failed to add evaluators', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const assignCriteriaWeights = useCallback(async (prizeId: number, weights: number[]) => {
        return handleContractInteraction(async (contract) => {
            await contract.assignCriteriaWeights(weights);
        }, 'Failed to assign criteria weights', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const moveToNextState = useCallback(async (prizeId: number): Promise<PrizeStatus | null> => {
        return handleContractInteraction(
            async (contract) => {
                const tx = await contract.moveToNextState(prizeId);
                await tx.wait();
                const newState = await contract.getPrizeState(prizeId);
                return newState as PrizeStatus;
            },
            'Failed to move prize to next state',
            prizeId.toString()
        );
    }, [handleContractInteraction]);

    const assignScores = useCallback(async (prizeId: number, contestants: string[], scores: number[][]) => {
        return handleContractInteraction(async (contract) => {
            await contract.assignScores(contestants, scores);
        }, 'Failed to assign scores', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const allocateRewards = useCallback(async (prizeId: number) => {
        return handleContractInteraction(async (contract) => {
            await contract.allocateRewards();
        }, 'Failed to allocate rewards', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const getPrizeState = useCallback(async (prizeId: number) => {
        return handleContractInteraction(async (contract) => {
            const state = await contract.getCurrentState();
            return PrizeStatus[state as keyof typeof PrizeStatus];
        }, 'Failed to get prize state', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    const deactivatePrize = useCallback(async (prizeId: number) => {
        return handleContractInteraction(async (contract) => {
            const prizeAddress = prizes[prizeId].prizeAddress;
            await contract.deactivatePrize(prizeAddress);
        }, 'Failed to deactivate prize');
    }, [handleContractInteraction, prizes]);

    const fundPrize = useCallback(async (prizeId: number, amount: string) => {
        return handleContractInteraction(async (contract) => {
            const tx = await contract.fundPrize({ value: ethers.parseEther(amount) });
            await tx.wait();
        }, 'Failed to fund prize', prizes[prizeId].prizeAddress);
    }, [handleContractInteraction, prizes]);

    return {
        prizes,
        loading,
        error,
        createPrize,
        getPrizes: getAllPrizes,
        getContributions,
        submitContribution,
        claimReward,
        addEvaluators,
        assignCriteriaWeights,
        moveToNextState,
        assignScores,
        allocateRewards,
        getPrizeState,
        deactivatePrize,
        fundPrize
    };
};