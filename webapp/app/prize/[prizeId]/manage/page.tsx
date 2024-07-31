'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatEther, parseEther } from 'viem';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { usePrizeContract } from '../../../../hooks/usePrizeContract';
import { usePrizeManager } from '../../../../hooks/usePrizeManager';
import { State } from '../../../types';

export default function ManagePrizePage() {
    const { prizeId } = useParams();
    const router = useRouter();
    const { address } = useAccount();
    const { getPrize } = usePrizeManager();
    const { data: prize, isLoading: isPrizeLoading } = getPrize(prizeId as string);
    const {
        roles,
        isLoadingRoles,
        currentState,
        moveToNextState,
        assignCriteriaWeights,
        fundPrize,
        addEvaluators,
        criteriaNames,
        criteriaWeights,
        monetaryRewardPool,
    } = usePrizeContract(prize?.prizeAddress as `0x${string}`);

    const [weights, setWeights] = useState<number[]>([]);
    const [evaluators, setEvaluators] = useState<string>('');
    const [fundAmount, setFundAmount] = useState<string>('');
    const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>(undefined);

    const { data: transactionReceipt, isError, isLoading: isLoadingTransaction, isSuccess } = useWaitForTransactionReceipt({
        hash: transactionHash,
    });

    useEffect(() => {
        if (isSuccess && transactionReceipt) {
            toast.success('Evaluators added successfully', { id: 'addEvaluators' });
            // Optionally, you can refetch or update the UI here
        } else if (isError) {
            toast.error('Failed to add evaluators. Please try again.', { id: 'addEvaluators' });
        }
    }, [isSuccess, isError, transactionReceipt]);

    useEffect(() => {
        if (criteriaWeights) {
            setWeights(criteriaWeights.map(weight => Number(weight)));
        }
    }, [criteriaWeights]);

    useEffect(() => {
        if (!roles.canManagePrize && !isLoadingRoles) {
            router.push(`/prize/${prizeId}`);
        }
    }, [roles.canManagePrize, isLoadingRoles, router, prizeId]);

    const handleWeightChange = (index: number, value: string) => {
        const newWeights = [...weights];
        newWeights[index] = parseInt(value, 10);
        setWeights(newWeights);
    };

    const handleAssignWeights = useCallback(async () => {
        try {
            await assignCriteriaWeights(weights);
            toast.success('Criteria weights assigned successfully');
        } catch (error) {
            console.error('Error assigning weights:', error);
            toast.error('Failed to assign weights');
        }
    }, [assignCriteriaWeights, weights]);

    const handleFundPrize = useCallback(async () => {
        try {
            const amount = parseEther(fundAmount);
            await fundPrize(amount);
            toast.success('Prize funded successfully');
        } catch (error) {
            console.error('Error funding prize:', error);
            toast.error('Failed to fund prize');
        }
    }, [fundPrize, fundAmount]);

    const handleAddEvaluators = useCallback(async () => {
        try {
            const evaluatorAddresses = evaluators.split(',').map(addr => addr.trim());
            toast.loading('Adding evaluators...', { id: 'addEvaluators' });
            const hash = await addEvaluators(evaluatorAddresses as `0x${string}`[]);
            if (!hash) {
                throw new Error('Transaction failed to initiate');
            }
            setTransactionHash(hash);
            toast.loading('Transaction submitted. Waiting for confirmation...', { id: 'addEvaluators' });
        } catch (error) {
            console.error('Error adding evaluators:', error);
            toast.error('Failed to add evaluators. Please try again.', { id: 'addEvaluators' });
        }
    }, [addEvaluators, evaluators]);

    const handleMoveToNextState = useCallback(async () => {
        try {
            await moveToNextState();
            toast.success('Moved to next state successfully');
        } catch (error) {
            console.error('Error moving to next state:', error);
            toast.error('Failed to move to next state');
        }
    }, [moveToNextState]);

    if (isPrizeLoading || isLoadingRoles || !prize) {
        return <div className="flex justify-center items-center h-screen text-white text-2xl">Loading...</div>;
    }

    if (!roles.canManagePrize) {
        return <div className="flex justify-center items-center h-screen text-red-500 text-2xl">You do not have permission to manage this prize.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-purple-900 py-12">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-purple-800 px-6 py-4">
                        <h2 className="text-3xl font-bold text-white">Manage Prize: {prize.name}</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <ManagementCard title={`Current State: ${State[currentState]}`}>
                            <button
                                onClick={handleMoveToNextState}
                                className="button-primary w-full"
                            >
                                Move to Next State
                            </button>
                        </ManagementCard>

                        <ManagementCard title="Fund Prize">
                            <p className="mb-4">Current pool: {formatEther(monetaryRewardPool || 0n)} ETH</p>
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    value={fundAmount}
                                    onChange={(e) => setFundAmount(e.target.value)}
                                    placeholder="Amount in ETH"
                                    className="form-input flex-grow"
                                />
                                <button
                                    onClick={handleFundPrize}
                                    className="button-secondary ml-2"
                                >
                                    Fund Prize
                                </button>
                            </div>
                        </ManagementCard>

                        {currentState === State.Setup && (
                            <ManagementCard title="Assign Criteria Weights">
                                {criteriaNames && criteriaNames.length > 0 ? (
                                    <>
                                        {criteriaNames.map((name, index) => (
                                            <div key={index} className="mb-4 flex items-center">
                                                <label className="w-1/3">{name}:</label>
                                                <input
                                                    type="number"
                                                    value={weights[index] || ''}
                                                    onChange={(e) => handleWeightChange(index, e.target.value)}
                                                    className="form-input w-2/3"
                                                />
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleAssignWeights}
                                            className="button-primary w-full mt-4"
                                        >
                                            Assign Weights
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-purple-300">No criteria names available.</p>
                                )}
                            </ManagementCard>
                        )}

                        <ManagementCard title="Add Evaluators">
                            <textarea
                                value={evaluators}
                                onChange={(e) => setEvaluators(e.target.value)}
                                placeholder="Enter evaluator addresses, separated by commas"
                                className="form-input h-32"
                            />
                            <button
                                onClick={handleAddEvaluators}
                                className="button-primary w-full mt-4"
                            >
                                Add Evaluators
                            </button>
                        </ManagementCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ManagementCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="bg-purple-100 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-purple-800">{title}</h2>
            {children}
        </div>
    );
}