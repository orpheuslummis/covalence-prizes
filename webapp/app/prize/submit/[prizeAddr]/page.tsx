'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { useError } from '../../../../hooks/useError';
import { usePrizeContract } from '../../../../hooks/usePrizeContract';
import { usePrizeManager } from '../../../../hooks/usePrizeManager';

export default function SubmitContributionPage() {
    const { prizeAddr } = useParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { handleError } = useError();
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        submitContribution,
        getName,
        getDescription,
        getPrizeState,
        canSubmit,
        isWritePending,
    } = usePrizeContract(prizeAddr as `0x${string}`);

    const { getPrize } = usePrizeManager();

    const { data: prize, isLoading, error } = useQuery(
        ['prize', prizeAddr],
        () => getPrize(prizeAddr as string).data,
        {
            enabled: isConnected,
            onError: (error) => handleError('Failed to fetch prize details', error as Error),
        }
    );

    useEffect(() => {
        if (!isConnected) {
            toast.error('Please connect your wallet to submit a contribution.');
            router.push(`/prize/${prizeAddr}`);
        }
    }, [isConnected, router, prizeAddr]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected || !canSubmit()) {
            toast.error('You do not have permission to submit a contribution.');
            return;
        }
        setIsSubmitting(true);

        try {
            await submitContribution([description]);
            toast.success('Contribution submitted successfully!');
            router.push(`/prize/${prizeAddr}`);
        } catch (error) {
            console.error('Error submitting contribution:', error);
            handleError('Failed to submit contribution', error as Error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (!isConnected) return null;
    if (!prize) return <div>Prize not found</div>;

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
                            disabled={isSubmitting || isWritePending || !canSubmit()}
                            className={`w-full bg-purple-600 text-white py-3 px-4 rounded-md text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors ${(isSubmitting || isWritePending || !canSubmit())
                                ? 'opacity-50 cursor-not-allowed bg-purple-400'
                                : 'hover:bg-purple-700'
                                }`}
                        >
                            {isSubmitting || isWritePending ? 'Submitting...' : 'Submit Contribution'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}