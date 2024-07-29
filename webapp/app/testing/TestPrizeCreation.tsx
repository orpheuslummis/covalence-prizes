'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { parseEther } from 'viem';
import { useAccount, useBalance, useWalletClient } from 'wagmi';
import { config } from '../../config';
import { usePrizeManager } from '../../hooks/usePrizeManager';
import { useWeb3 } from '../../hooks/useWeb3';
import { useError } from '../ErrorContext';

interface TestPrize {
    name: string;
    description: string;
    rewardPool: string;
    strategy: string;
    criteria: string[];
}

const generateRandomPrize = (): TestPrize => {
    const strategies = Object.keys(config.allocationStrategies);
    const criteriaOptions = [
        'Innovation', 'Feasibility', 'Impact', 'Scalability', 'Sustainability',
        'Cost-effectiveness', 'Originality', 'User Experience', 'Technical Complexity',
        'Market Potential', 'Social Responsibility', 'Environmental Impact'
    ];

    const adjectives = ['Groundbreaking', 'Revolutionary', 'Innovative', 'Futuristic', 'Disruptive'];
    const domains = ['AI', 'Blockchain', 'IoT', 'Quantum Computing', 'Biotech', 'Clean Energy', 'Space Tech'];

    return {
        name: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${domains[Math.floor(Math.random() * domains.length)]} Solution ${Math.floor(Math.random() * 10000)}`,
        description: `Pioneering ${domains[Math.floor(Math.random() * domains.length)]} project aiming to revolutionize ${criteriaOptions[Math.floor(Math.random() * criteriaOptions.length)].toLowerCase()} in the ${new Date().getFullYear() + Math.floor(Math.random() * 10)} landscape.`,
        rewardPool: (Math.random() * 0.00001 + 0.00001).toFixed(6), // Smaller reward pool for testing
        strategy: strategies[Math.floor(Math.random() * strategies.length)],
        criteria: Array.from(new Set(Array(Math.floor(Math.random() * 5) + 3).fill(null).map(() =>
            criteriaOptions[Math.floor(Math.random() * criteriaOptions.length)]
        )))
    };
};

const TestPrizeCreation: React.FC = () => {
    const [testPrize, setTestPrize] = useState<TestPrize>(generateRandomPrize());
    const { createPrize, getPrizes } = usePrizeManager();
    const { handleError } = useError();
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });
    const { publicClient } = useWeb3();
    const { data: walletClient } = useWalletClient();

    useEffect(() => {
        if (!isConnected) {
            toast.info('Please connect your wallet to create prizes.', {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        }
    }, [isConnected]);

    useEffect(() => {
        console.log('Wallet connection status:', isConnected ? 'Connected' : 'Disconnected');
        console.log('Wallet address:', address);
        console.log('Wallet client:', walletClient ? 'Available' : 'Not available');
    }, [isConnected, address, walletClient]);

    const handleCreatePrize = async () => {
        console.log('Creating prize...');
        console.log('Wallet connection status:', isConnected ? 'Connected' : 'Disconnected');
        console.log('Wallet address:', address);
        console.log('Wallet client:', walletClient ? 'Available' : 'Not available');

        if (!isConnected || !address || !walletClient) {
            toast.error('Please connect your wallet before creating a prize.');
            return;
        }

        const rewardPoolValue = parseEther(testPrize.rewardPool);
        const estimatedGas = parseEther('0.001'); // Rough estimate, adjust as needed

        if (balance && balance.value < rewardPoolValue + estimatedGas) {
            toast.error('Insufficient funds. Please ensure you have enough ETH for the reward pool and gas fees.');
            return;
        }

        try {
            const createdPrize = await createPrize(
                testPrize.name,
                testPrize.description,
                testPrize.rewardPool,
                testPrize.strategy,
                testPrize.criteria
            );

            if (createdPrize) {
                toast.success('Prize created successfully!');
                setTestPrize(generateRandomPrize());
            } else {
                toast.error('Failed to create prize. Please try again.');
            }
        } catch (error) {
            console.error('Error creating prize:', error);
            toast.error(`Failed to create prize: ${error.message}`);
        }
    };

    const handleGenerateNewPrize = () => {
        setTestPrize(generateRandomPrize());
    };

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
                        <p className="font-semibold text-blue-800 mb-2">Reward Pool:</p>
                        <p className="text-blue-700 text-xl">{testPrize.rewardPool} ETH</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg">
                        <p className="font-semibold text-green-800 mb-2">Allocation Strategy:</p>
                        <p className="text-green-700 text-xl">{testPrize.strategy}</p>
                    </div>
                </div>
                <div className="mb-6 bg-yellow-100 p-6 rounded-lg">
                    <p className="font-semibold text-yellow-800 mb-3">Criteria:</p>
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
                        disabled={!isConnected || !address || !walletClient}
                    >
                        Create Prize
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestPrizeCreation;