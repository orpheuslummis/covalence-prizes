'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAccount, useWaitForTransaction } from 'wagmi';
import { useError } from '../../../../hooks/useError';
import { usePrizeContract } from '../../../../hooks/usePrizeContract';
import { usePrizeManager } from '../../../../hooks/usePrizeManager';
import { State } from '../../../types';

export default function SubmitContributionPage() {
    const { prizeId } = useParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { handleError } = useError();
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

    const {
        submitContribution,
        contribution,
        refetchContribution,
        roles,
        isLoadingRoles,
        currentState,
    } = usePrizeContract(prizeId as `0x${string}`);

    const { getPrize } = usePrizeManager();
    const { data: prize, isLoading: isPrizeLoading, error: prizeError } = getPrize(prizeId as string);

    const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });

    useEffect(() => {
        if (receipt && receipt.status === 1) { // or receipt.status === '0x1'
            toast.success('Contribution submitted successfully!');
            router.push(`/prize/${prizeId}`);
        }
    }, [receipt, router, prizeId]);

    useEffect(() => {
        if (!isConnected) {
            toast.error('Please connect your wallet to submit a contribution.');
            router.push(`/prize/${prizeId}`);
        }
    }, [isConnected, router, prizeId]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const description = formData.get('description') as string;
        console.log('Submitting contribution with description:', description);
        try {
            const result = await submitContribution(description);
            console.log('Submission successful:', result);
            await refetchContribution();
            console.log('Contribution refetched');
        } catch (error) {
            console.error('Error submitting contribution:', error);
            handleError('Failed to submit contribution', error as Error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Memoize the rendered content
    const content = useMemo(() => {
        if (isPrizeLoading || isLoadingRoles) return <div>Loading...</div>;
        if (!isConnected) return null;
        if (prizeError || !prize) return <div>Prize not found</div>;

        return (
            <div className="container mx-auto px-4 py-8 bg-purple-50 min-h-screen">
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-purple-600 px-6 py-4">
                        <h2 className="text-3xl font-bold text-white">Submit Contribution</h2>
                    </div>
                    <div className="p-6">
                        <h3 className="text-2xl font-semibold mb-2 text-purple-800">{prize.name}</h3>
                        <p className="text-gray-700 mb-6">{prize.description}</p>

                        <div className="mb-6 bg-purple-100 p-4 rounded-lg">
                            <h4 className="text-lg font-semibold mb-2 text-purple-800">Current Prize State</h4>
                            <p className="text-gray-700">
                                The prize is currently in the <strong>{State[currentState]}</strong> state.<br />
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
                                disabled={isSubmitting || !roles.canSubmit || currentState !== State.Open}
                                className={`w-full bg-purple-600 text-white py-3 px-4 rounded-md text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors ${(isSubmitting || !roles.canSubmit || currentState !== State.Open)
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
    }, [isPrizeLoading, isLoadingRoles, isConnected, prizeError, prize, roles, currentState, description, isSubmitting, handleSubmit]);

    return content;
}