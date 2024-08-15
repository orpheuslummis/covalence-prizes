'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatEther, parseEther } from 'viem';
import { useAccount } from 'wagmi';
import { AllocationStrategy, Prize, State } from '../../../../types';
import { useAppContext } from '../../../AppContext';

export default function ManagePrizePage() {
    const { prizeId } = useParams();
    const router = useRouter();
    const { address } = useAccount();
    const { prizeDiamond, isPrizesLoading, prizes } = useAppContext();

    const [prize, setPrize] = useState<Prize | null>(null);
    const [weights, setWeights] = useState<number[]>([]);
    const [evaluators, setEvaluators] = useState<string>('');
    const [fundAmount, setFundAmount] = useState<string>('');
    const [isOrganizer, setIsOrganizer] = useState<boolean>(false);
    const [isOrganizerLoaded, setIsOrganizerLoaded] = useState<boolean>(false);
    const [isFunded, setIsFunded] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('ManagePrizePage: Component mounted');
        console.log('prizeId:', prizeId);
        console.log('isPrizesLoading:', isPrizesLoading);
        console.log('prizes:', prizes);
    }, [prizeId, isPrizesLoading, prizes]);

    useEffect(() => {
        const fetchPrizeDetails = async () => {
            console.log('fetchPrizeDetails: Starting');
            if (prizeId && !isPrizesLoading) {
                console.log('fetchPrizeDetails: Conditions met, fetching details');
                try {
                    setIsLoading(true);
                    console.log('Fetching prize details for ID:', prizeId);
                    const prizeDetails = await prizeDiamond.getPrizeDetails(BigInt(prizeId as string));
                    console.log('Prize details fetched:', prizeDetails);
                    setPrize(prizeDetails);
                    setFundAmount(formatEther(prizeDetails.monetaryRewardPool));
                    setIsFunded(prizeDetails.fundedAmount >= prizeDetails.monetaryRewardPool);
                    console.log('Fetching criteria weights');
                    const criteriaWeights = await prizeDiamond.getCriteriaWeights(BigInt(prizeId as string));
                    console.log('Criteria weights fetched:', criteriaWeights);
                    setWeights(criteriaWeights.map(Number));
                    console.log('Fetching allocation strategy');
                    const strategy = await prizeDiamond.getAllocationStrategy(BigInt(prizeId as string));
                    console.log('Allocation strategy:', AllocationStrategy[strategy as AllocationStrategy]);
                    console.log('Checking if user is organizer');
                    const organizer = await prizeDiamond.isPrizeOrganizer(BigInt(prizeId as string), address as `0x${string}`);
                    console.log('Is user organizer:', organizer);
                    setIsOrganizer(organizer);
                    setIsOrganizerLoaded(true);
                    setIsLoading(false);
                    console.log('fetchPrizeDetails: Completed successfully');
                } catch (error) {
                    console.error('Error fetching prize details:', error);
                    setError('Failed to load prize details. Please try again.');
                    setIsLoading(false);
                    setIsOrganizerLoaded(true);
                }
            } else {
                console.log('fetchPrizeDetails: Conditions not met, skipping fetch');
            }
        };
        fetchPrizeDetails();
    }, [prizeId, prizeDiamond, address, isPrizesLoading]);

    useEffect(() => {
        console.log('Current state:', {
            prize,
            weights,
            isOrganizer,
            isOrganizerLoaded,
            isFunded,
            isLoading,
            error
        });
    }, [prize, weights, isOrganizer, isOrganizerLoaded, isFunded, isLoading, error]);

    const handleWeightChange = (index: number, value: string) => {
        const newWeights = [...weights];
        newWeights[index] = parseInt(value, 10);
        setWeights(newWeights);
    };

    const handleAssignWeights = useCallback(async () => {
        try {
            const loadingToast = toast.loading('Assigning criteria weights...');
            await prizeDiamond.assignCriteriaWeights({ prizeId: BigInt(prizeId as string), weights });
            toast.dismiss(loadingToast);
            toast.success('Criteria weights assigned successfully');
        } catch (error) {
            console.error('Error assigning weights:', error);
            toast.error('Failed to assign weights');
        }
    }, [prizeDiamond, weights, prizeId]);

    const handleFundPrize = useCallback(async () => {
        if (isFunded) {
            toast.error('Prize is already funded');
            return;
        }
        try {
            const amount = parseEther(fundAmount);
            const loadingToast = toast.loading('Funding prize...');

            await prizeDiamond.fundTotallyAsync({ prizeId: BigInt(prizeId as string), amount });

            toast.dismiss(loadingToast);
            toast.success('Prize funded successfully');

            const updatedPrize = await prizeDiamond.getPrizeDetails(BigInt(prizeId as string));
            setPrize(updatedPrize);
            setIsFunded(updatedPrize.fundedAmount >= updatedPrize.monetaryRewardPool);
        } catch (error) {
            console.error('Error funding prize:', error);
            toast.error('Failed to fund prize');
        }
    }, [prizeDiamond, fundAmount, prizeId, isFunded]);

    const handleAddEvaluators = useCallback(async () => {
        try {
            const evaluatorAddresses = evaluators.split(',').map(addr => {
                const trimmed = addr.trim();
                if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
                    throw new Error(`Invalid Ethereum address: ${trimmed}`);
                }
                return trimmed as `0x${string}`;
            });
            const loadingToast = toast.loading('Adding evaluators...');
            await prizeDiamond.addEvaluators({ prizeId: BigInt(prizeId as string), evaluators: evaluatorAddresses });
            toast.dismiss(loadingToast);
            toast.success('Evaluators added successfully');
            setEvaluators('');
        } catch (error) {
            console.error('Error adding evaluators:', error);
            toast.error('Failed to add evaluators: ' + (error instanceof Error ? error.message : String(error)));
        }
    }, [prizeDiamond, evaluators, prizeId]);

    const handleMoveToNextState = useCallback(async () => {
        try {
            const loadingToast = toast.loading('Moving to next state...');
            await prizeDiamond.moveToNextState(BigInt(prizeId as string));
            toast.dismiss(loadingToast);
            toast.success('Moved to next state successfully');

            // Optionally, update the prize state
            const updatedPrize = await prizeDiamond.getPrizeDetails(BigInt(prizeId as string));
            setPrize(updatedPrize);
        } catch (error) {
            console.error('Error moving to next state:', error);
            toast.error('Failed to move to next state');
        }
    }, [prizeDiamond, prizeId]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen text-white text-2xl">Loading prize data...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500 text-2xl">{error}</div>;
    }

    if (!prize) {
        return <div className="flex justify-center items-center h-screen text-white text-2xl">Prize not found</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-purple-900 py-12">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-purple-800 px-6 py-4">
                        <h2 className="text-3xl font-bold text-white">Manage Prize: {prize.name}</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <ManagementCard title="How to Manage a Prize">
                            <ol className="list-decimal list-inside space-y-2 text-purple-800">
                                <li>Fund the prize with the required amount.</li>
                                <li>Assign weights to the criteria (if in Setup state).</li>
                                <li>Add evaluators who will judge the submissions.</li>
                                <li>Move through the states as the prize progresses:</li>
                            </ol>
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-purple-700">
                                <li><strong>Setup:</strong> Initial state for prize configuration.</li>
                                <li><strong>Open:</strong> Contributions are accepted from contestants.</li>
                                <li><strong>Evaluating:</strong> Evaluators can submit their assessments.</li>
                                <li><strong>Allocating:</strong> Organizer computes the reward allocation.</li>
                                <li><strong>Claiming:</strong> Contestants can claim their rewards.</li>
                                <li><strong>Closed:</strong> Final state when all rewards are claimed.</li>
                            </ul>
                            <p className="mt-4 text-purple-600">As the prize organizer, you are responsible for moving the prize through these states using the &ldquo;Move to Next State&rdquo; button below.</p>
                            <p className="mt-2 text-purple-600">Complete these steps in order to properly set up and manage your prize.</p>
                        </ManagementCard>

                        <ManagementCard title="Fund Prize">
                            <p className="mb-4">Required funding: {formatEther(prize.monetaryRewardPool)} ETH</p>
                            <p className="mb-4">Current funding: {formatEther(prize.fundedAmount)} ETH</p>
                            <p className="mb-4">Status: {isFunded ? 'Fully Funded' : 'Not Fully Funded'}</p>
                            {!isFunded && prize.state === State.Setup && (
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        value={fundAmount}
                                        onChange={(e) => setFundAmount(e.target.value)}
                                        className="form-input flex-grow"
                                    />
                                    <button
                                        onClick={handleFundPrize}
                                        className="button-secondary ml-2"
                                    >
                                        Fund Prize
                                    </button>
                                </div>
                            )}
                            {isFunded && (
                                <p className="text-green-600 font-semibold">Prize is fully funded.</p>
                            )}
                        </ManagementCard>

                        {prize.state === State.Setup && (
                            <ManagementCard title="Assign Criteria Weights">
                                {prize.criteriaNames && prize.criteriaNames.length > 0 ? (
                                    <>
                                        {prize.criteriaNames.map((name: string, index: number) => (
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

                        <ManagementCard title={`Current State: ${State[prize.state]}`}>
                            <button
                                onClick={handleMoveToNextState}
                                className="button-primary w-full"
                            >
                                Move to Next State
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