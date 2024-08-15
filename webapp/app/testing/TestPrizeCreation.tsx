'use client';

import { parseEther } from 'ethers';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatEther } from 'viem';
import { useAccount, useBalance } from 'wagmi';
import { useError } from '../../hooks/useError';
import { usePrizeDiamond } from '../../hooks/usePrizeDiamond';
import { AllocationStrategy, PrizeParams } from '../../types';

interface TestPrize {
    name: string;
    description: string;
    monetaryRewardPool: bigint;
    criteria: string[];
    criteriaWeights: number[];
    strategy: AllocationStrategy;
    allocationStrategy: AllocationStrategy;
}

const TestPrizeCreation: React.FC = () => {
    const generateRandomPrize = React.useCallback(() => {
        const strategies = [AllocationStrategy.Linear];
        const criteriaOptions = [
            'Innovation', 'Feasibility', 'Impact', 'Scalability', 'Sustainability',
            'Cost-effectiveness', 'Originality', 'User Experience', 'Technical Complexity',
            'Market Potential', 'Social Responsibility', 'Environmental Impact'
        ];

        const adjectives = ['Groundbreaking', 'Revolutionary', 'Innovative', 'Futuristic', 'Disruptive'];
        const domains = ['AI', 'Blockchain', 'IoT', 'Quantum Computing', 'Biotech', 'Clean Energy', 'Space Tech'];

        const criteria = Array.from(new Set(Array(Math.floor(Math.random() * 3) + 2).fill(null).map(() =>
            criteriaOptions[Math.floor(Math.random() * criteriaOptions.length)]
        )));

        return {
            name: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${domains[Math.floor(Math.random() * domains.length)]} Solution ${Math.floor(Math.random() * 10000)}`,
            description: `Pioneering ${domains[Math.floor(Math.random() * domains.length)]} project aiming to revolutionize ${criteriaOptions[Math.floor(Math.random() * criteriaOptions.length)].toLowerCase()} in the ${new Date().getFullYear() + Math.floor(Math.random() * 10)} landscape.`,
            monetaryRewardPool: parseEther("0.00001"),
            criteria: criteria,
            criteriaWeights: Array(criteria.length).fill(1), // Match the length of criteria
            strategy: AllocationStrategy.Linear,
            allocationStrategy: AllocationStrategy.Linear,
        };
    }, []);

    const { createPrizeAsync } = usePrizeDiamond();
    const { handleError } = useError();
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    const [testPrize, setTestPrize] = useState<TestPrize | null>(null);

    useEffect(() => {
        // Generate the initial prize on the client side only
        setTestPrize(generateRandomPrize());
    }, [generateRandomPrize]);

    useEffect(() => {
        if (!isConnected) {
            toast('Please connect your wallet to create prizes.', {
                duration: 5000,
                position: 'top-center',
            });
        }
    }, [isConnected]);

    useEffect(() => {
        console.log('Wallet connection status:', isConnected ? 'Connected' : 'Disconnected');
        console.log('Wallet address:', address);
    }, [isConnected, address]);

    const handleCreatePrize = async () => {
        console.log('Creating prize...');
        console.log('Wallet connection status:', isConnected ? 'Connected' : 'Disconnected');
        console.log('Wallet address:', address);

        if (!isConnected || !address) {
            toast.error('Please connect your wallet before creating a prize.');
            return;
        }

        if (!testPrize) {
            toast.error('No test prize data available.');
            return;
        }

        const rewardPoolValue = testPrize.monetaryRewardPool;
        const estimatedGas = parseEther('0.001'); // Rough estimate, adjust as needed

        if (balance && balance.value < rewardPoolValue + estimatedGas) {
            toast.error('Insufficient funds. Please ensure you have enough ETH for the reward pool and gas fees.');
            return;
        }

        try {
            const prizeParams: PrizeParams = {
                name: testPrize.name,
                description: testPrize.description,
                monetaryRewardPool: BigInt(testPrize.monetaryRewardPool),
                criteria: testPrize.criteria,
                criteriaWeights: testPrize.criteriaWeights.map(w => Number(w)),
                allocationStrategy: Number(testPrize.allocationStrategy) as AllocationStrategy,
            };

            const txHash = await createPrizeAsync(prizeParams);

            if (txHash) {
                toast.success('Prize created successfully!');
                setTestPrize(generateRandomPrize());
            } else {
                toast.error('Failed to create prize. Please try again.');
            }
        } catch (error) {
            console.error('Error creating prize:', error);
            handleError('Failed to create prize', error as Error);
            toast.error(`Failed to create prize: ${(error as Error).message}`);
        }
    };

    const handleGenerateNewPrize = () => {
        setTestPrize(generateRandomPrize());
    };

    const getStrategyName = (strategy: AllocationStrategy) => {
        return AllocationStrategy[strategy] || 'Unknown';
    };

    if (!testPrize) {
        return <div>Loading...</div>; // or any loading indicator
    }

    return (
        <div className="max-w-4xl mx-auto mb-8 bg-white shadow-lg rounded-lg overflow-hidden">
            <h2 className="text-3xl font-bold p-6 bg-purple-600 text-white">Test Prize Creation</h2>
            <div className="p-8">
                <div className="mb-6 bg-purple-100 p-6 rounded-lg">
                    <h3 className="text-2xl font-semibold mb-3 text-purple-800">{testPrize.name}</h3>
                    <p className="text-purple-700 text-lg">{testPrize.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-blue-100 p-4 rounded-lg">
                        <h2 className="font-semibold text-blue-800 mb-2 text-xl">Amount</h2>
                        <div className="prize-amount-value">
                            <p className="text-blue-700 text-2xl font-bold">
                                {formatEther(testPrize.monetaryRewardPool)} ETH
                            </p>
                        </div>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg">
                        <h2 className="font-semibold text-green-800 mb-2 text-xl">Allocation Strategy</h2>
                        <p className="text-green-700 text-2xl font-bold">
                            {getStrategyName(testPrize.allocationStrategy)}
                        </p>
                    </div>
                </div>
                <div className="mb-6 bg-yellow-100 p-6 rounded-lg">
                    <h2 className="font-semibold text-yellow-800 mb-3 text-xl">Evaluation Criteria</h2>
                    <ul className="list-disc list-inside text-yellow-700 text-lg">
                        {testPrize.criteria.map((criterion, index) => (
                            <li key={index} className="mb-2">{criterion}</li>
                        ))}
                    </ul>
                </div>
                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={handleGenerateNewPrize}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300"
                    >
                        Generate New Prize
                    </button>
                    <button
                        onClick={handleCreatePrize}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300"
                        disabled={!isConnected || !address}
                    >
                        Create Prize
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestPrizeCreation;