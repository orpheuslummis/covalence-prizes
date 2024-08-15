'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Hash } from 'viem';
import { useAccount } from 'wagmi';
import { useAppContext } from '../../../../app/AppContext';
import { useError } from '../../../../hooks/useError';
import { State } from '../../../../types';

export default function SubmitContributionPage() {
    const { prizeId } = useParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { handleError } = useError();
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { prizeDiamond, blockNumber } = useAppContext();

    const {
        submitContribution,
        getPrizeDetails,
        getState,
    } = prizeDiamond;

    const { data: prizeDetails, isLoading: isLoadingPrizeDetails } = useQuery({
        queryKey: ['prizeDetails', prizeId, blockNumber],
        queryFn: () => getPrizeDetails(BigInt(prizeId as string)),
        enabled: !!prizeId,
    });

    const { data: currentState, isLoading: isLoadingState } = useQuery({
        queryKey: ['prizeState', prizeId, blockNumber],
        queryFn: () => getState(BigInt(prizeId as string)),
        enabled: !!prizeId,
    });

    useEffect(() => {
        if (!isConnected) {
            toast.error('Please connect your wallet to submit a contribution.');
            router.push(`/prize/${prizeId}`);
        }
    }, [isConnected, router, prizeId]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const txHash = await submitContribution({ prizeId: BigInt(prizeId as string), description }) as Hash;

            // Wait for the transaction to be confirmed
            await prizeDiamond.waitForTransaction(txHash);

            toast.success('Contribution submitted successfully!');
            router.push(`/prize/${prizeId}`);
        } catch (error) {
            console.error('Error submitting contribution:', error);
            handleError('Failed to submit contribution', error as Error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Memoize the rendered content
    const content = useMemo(() => {
        if (isLoadingPrizeDetails || isLoadingState) return <div>Loading...</div>;
        if (!isConnected) return null;

        return (
            <div className="container mx-auto px-4 py-8 bg-purple-50 min-h-screen">
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-purple-600 px-6 py-4">
                        <h2 className="text-3xl font-bold text-white">Submit Contribution</h2>
                    </div>
                    <div className="p-6">
                        <h3 className="text-2xl font-semibold mb-2 text-purple-800">{prizeDetails?.name}</h3>
                        <p className="text-gray-700 mb-6">{prizeDetails?.description}</p>

                        <div className="mb-6 bg-purple-100 p-4 rounded-lg">
                            <h4 className="text-lg font-semibold mb-2 text-purple-800">Current Prize State</h4>
                            <p className="text-gray-700">
                                The prize is currently in the <strong>{State[currentState as number]}</strong> state.<br />
                                {currentState !== State.Open && (
                                    <span className="text-red-600"> Submissions are only allowed when the prize is in the Open state.</span>
                                )}
                            </p>
                        </div>

                        <div className="mb-6 bg-purple-100 p-4 rounded-lg">
                            <h4 className="text-lg font-semibold mb-2 text-purple-800">About Submitting a Contribution</h4>
                            <p className="text-gray-700">
                                By submitting a contribution, you're proposing a solution or idea for this prize.
                                Your submission will be evaluated based on the prize criteria. Make sure your
                                description is clear, concise, and addresses the prize objectives.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="description" className="block text-lg font-medium text-gray-800 mb-2">
                                    Contribution Description
                                </label>
                                <textarea
                                    id="description"
                                    rows={6}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    placeholder="Describe your contribution here..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || currentState !== State.Open}
                                className={`w-full bg-purple-600 text-white py-3 px-4 rounded-md text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors ${(isSubmitting || currentState !== State.Open)
                                    ? 'opacity-50 cursor-not-allowed bg-purple-400'
                                    : 'hover:bg-purple-700'
                                    }`}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Contribution'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }, [isLoadingPrizeDetails, isLoadingState, isConnected, prizeDetails, currentState, description, isSubmitting, handleSubmit]);

    return content;
}