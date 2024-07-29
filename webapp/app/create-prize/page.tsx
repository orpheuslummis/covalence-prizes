'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAccount } from 'wagmi';
import { config, isValidAmount } from '../../config';
import { usePrizeManager } from '../../hooks/usePrizeManager';
import { useError } from '../ErrorContext';

const { allocationStrategies } = config;

export default function CreatePrizePage() {
    const router = useRouter();
    const { createPrize } = usePrizeManager();
    const { handleError } = useError();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [totalRewardPool, setTotalRewardPool] = useState('');
    const [allocationStrategy, setAllocationStrategy] = useState(Object.keys(allocationStrategies)[0] || '');
    const [criteriaNames, setCriteriaNames] = useState<string[]>(['']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { isConnected } = useAccount();
    const [isUserConnected, setIsUserConnected] = useState(false);

    useEffect(() => {
        setIsUserConnected(isConnected);
        if (!isConnected) {
            toast.warn('Please connect your wallet to create a prize.');
        }
    }, [isConnected]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isUserConnected) {
            toast.warn('Please connect your wallet to create a prize.');
            return;
        }
        setIsSubmitting(true);

        try {
            // Validate individual fields
            if (!name.trim()) throw new Error('Name is required');
            if (!description.trim()) throw new Error('Description is required');
            console.log('Total Reward Pool:', totalRewardPool);
            console.log('Is Valid Amount:', isValidAmount(totalRewardPool));
            if (!isValidAmount(totalRewardPool)) throw new Error('Invalid reward pool amount');
            if (!allocationStrategy.trim()) throw new Error('Allocation strategy is required');
            if (criteriaNames.some(name => !name.trim())) throw new Error('All criteria names must be filled');

            const createdPrize = await createPrize(
                name.trim(),
                description.trim(),
                totalRewardPool,
                allocationStrategy.trim(),
                criteriaNames.filter(name => name.trim())
            );

            if (createdPrize) {
                console.log('Prize created successfully. Initial state:', createdPrize.state);
                router.push(`/prize/${createdPrize.id}`);
            } else {
                throw new Error('Failed to create prize: No prize data returned');
            }
        } catch (error) {
            console.error('Detailed error in handleSubmit:', error);
            handleError('Error creating prize', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-purple-900 py-12">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-purple-800 px-6 py-4">
                        <h2 className="text-3xl font-bold text-white">Organize a New Prize</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-600 mb-8">
                            Covalence Prizes is a decentralized platform for creating and managing prizes
                            using homomorphic smart contracts. Prizes incentivize innovation and
                            contributions across various fields. As an organizer, you can define the prize
                            details, evaluation criteria, and allocation strategy. This form allows you to set
                            up a new prize that will be managed transparently on the blockchain.
                        </p>
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
                                    onChange={(e) => setAllocationStrategy(e.target.value)}
                                    className="form-input"
                                    required
                                >
                                    {Object.keys(allocationStrategies).length > 0 ? (
                                        Object.entries(allocationStrategies).map(([key, strategy]) => (
                                            <option key={key} value={key}>{strategy.name}</option>
                                        ))
                                    ) : (
                                        <option value="">No strategies available</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Criteria Names</label>
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
                                    disabled={isSubmitting || !isUserConnected}
                                    className={`button-primary w-full ${(isSubmitting || !isUserConnected) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isUserConnected ? 'Create Prize' : 'Connect Wallet to Create Prize'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}