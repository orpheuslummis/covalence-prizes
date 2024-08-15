'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { parseEther } from 'viem';
import { useAccount, useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { allocationStrategies, isValidAmount } from '../../config';
import { useError } from '../../hooks/useError';
import { usePrizeDiamond } from '../../hooks/usePrizeDiamond';
import { AllocationStrategy, PrizeParams } from '../../types';

export default function CreatePrizePage() {
    const router = useRouter();
    const { createPrizeAsync, getPrizes } = usePrizeDiamond();
    const { handleError } = useError();
    const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>(undefined);
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    const { data: transactionReceipt, isError, isLoading, isSuccess } = useWaitForTransactionReceipt({
        hash: transactionHash,
    })

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [totalRewardPool, setTotalRewardPool] = useState('');
    const [allocationStrategy, setAllocationStrategy] = useState<AllocationStrategy>(
        (Object.keys(allocationStrategies)[0] as unknown as AllocationStrategy) || AllocationStrategy.Linear
    );
    const [criteriaNames, setCriteriaNames] = useState<string[]>(['']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isConnected) {
            toast.error('Please connect your wallet to create a prize.');
        }
    }, [isConnected]);

    const handleTransactionSuccess = useCallback(async () => {
        toast.success('Prize created successfully');
        try {
            const prizesResult = await getPrizes(1n, 1n);
            if (prizesResult && prizesResult.length > 0) {
                const createdPrize = prizesResult[0];
                if (createdPrize && createdPrize.id) {
                    router.push(`/prize/${createdPrize.id}`);
                } else {
                    throw new Error('Failed to retrieve the created prize');
                }
            } else {
                throw new Error('Failed to fetch the created prize');
            }
        } catch (error) {
            console.error('Error after transaction success:', error);
            toast.error('Prize created, but there was an error loading the details.');
            router.push('/prizes');
        }
    }, [getPrizes, router]);

    useEffect(() => {
        if (isSuccess && transactionReceipt) {
            handleTransactionSuccess();
        } else if (isError) {
            toast.error('Transaction failed. Please try again.');
        }
    }, [isSuccess, isError, transactionReceipt, handleTransactionSuccess]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected || !address) {
            toast.error('Please connect your wallet to create a prize.');
            return;
        }
        setIsSubmitting(true);

        try {
            if (!name.trim()) throw new Error('Name is required');
            if (!description.trim()) throw new Error('Description is required');
            if (!isValidAmount(totalRewardPool)) throw new Error('Invalid reward pool amount');
            if (criteriaNames.some(name => !name.trim())) throw new Error('All criteria names must be filled');

            const rewardPoolValue = parseEther(totalRewardPool);
            const estimatedGas = parseEther('0.001'); // Rough estimate, adjust as needed

            if (balance && balance.value < rewardPoolValue + estimatedGas) {
                throw new Error('Insufficient funds for reward pool and gas fees');
            }

            const prizeParams: PrizeParams = {
                name: name.trim(),
                description: description.trim(),
                monetaryRewardPool: rewardPoolValue,
                criteria: criteriaNames.filter(name => name.trim()),
                criteriaWeights: Array(criteriaNames.length).fill(1),
                allocationStrategy: allocationStrategy,
            };

            const hash = await createPrizeAsync(prizeParams);
            setTransactionHash(hash);
            toast.success('Transaction submitted. Waiting for confirmation...');
        } catch (error) {
            console.error('Detailed error in handleSubmit:', error);
            handleError('Error creating prize', error as Error);
            toast.error(`Failed to create prize: ${(error as Error).message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-purple-900 py-12">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-purple-800 px-6 py-4">
                        <h2 className="text-3xl font-bold text-white">Create a New Prize</h2>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="form-label">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="description" className="form-label">Description</label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="totalRewardPool" className="form-label">Total Reward Pool (ETH)</label>
                                <input
                                    type="number"
                                    id="totalRewardPool"
                                    value={totalRewardPool}
                                    onChange={(e) => setTotalRewardPool(e.target.value)}
                                    className="form-input"
                                    required
                                    step="0.0001"
                                    min="0.0001"
                                />
                            </div>
                            <div>
                                <label htmlFor="allocationStrategy" className="form-label">Allocation Strategy</label>
                                <select
                                    id="allocationStrategy"
                                    value={allocationStrategy}
                                    onChange={(e) => setAllocationStrategy(Number(e.target.value) as AllocationStrategy)}
                                    className="form-input"
                                    required
                                >
                                    {Object.entries(allocationStrategies).map(([key, strategy]) => (
                                        <option key={key} value={key}>{strategy.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Evaluation Criteria</label>
                                <div className="mt-2 space-y-2">
                                    {criteriaNames.map((criteria, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={criteria}
                                                onChange={(e) => {
                                                    const newCriteria = [...criteriaNames];
                                                    newCriteria[index] = e.target.value;
                                                    setCriteriaNames(newCriteria);
                                                }}
                                                className="form-input"
                                                placeholder={`Criteria ${index + 1}`}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newCriteria = criteriaNames.filter((_, i) => i !== index);
                                                    setCriteriaNames(newCriteria);
                                                }}
                                                className="button-danger"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCriteriaNames([...criteriaNames, ''])}
                                    className="button-secondary mt-2"
                                >
                                    Add Criteria
                                </button>
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !isConnected}
                                    className={`button-primary w-full ${(isSubmitting || !isConnected) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isConnected ? (isSubmitting ? 'Creating Prize...' : 'Create Prize') : 'Connect Wallet to Create Prize'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}