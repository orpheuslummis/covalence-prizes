'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePrizeManager } from '../../hooks/usePrizeManager';
import { Prize } from '../types';

export default function PrizePage() {
    const { prizeId } = useParams();
    const router = useRouter();
    const { isConnected, address } = useWeb3();
    const { getPrize, refreshPrize, moveToNextState } = usePrizeManager();
    const { canManagePrize, canEvaluate } = usePrizeContract();
    const [prize, setPrize] = useState<Prize | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrize = async () => {
            if (prizeId) {
                try {
                    setLoading(true);
                    console.log('Fetching prize with ID:', prizeId);
                    const fetchedPrize = await getPrize(prizeId as string);
                    if (fetchedPrize) {
                        setPrize(fetchedPrize);
                    } else {
                        setError(`Prize not found for ID: ${prizeId}. This could be due to an invalid prize address or the prize not existing.`);
                    }
                } catch (err: any) {
                    console.error('Error fetching prize:', err);
                    setError(`Failed to fetch prize details: ${err.message}. Prize ID: ${prizeId}`);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchPrize();
    }, [prizeId, getPrize]);

    const handleMoveToNextState = async () => {
        if (prize) {
            await moveToNextState(prize.prizeAddress);
            const updatedPrize = await refreshPrize(prize.prizeAddress);
            setPrize(updatedPrize);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!prize) return <div>Prize not found</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">{prize.name}</h1>

            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p>{prize.description}</p>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Total Reward Pool</h2>
                <p>{prize.pool} ETH</p>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Allocation Strategy</h2>
                <p>{prize.allocationStrategy}</p>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Criteria</h2>
                <ul>
                    {prize.criteriaNames.map((criterion, index) => (
                        <li key={index}>{criterion}</li>
                    ))}
                </ul>
            </div>

            {isConnected && (
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={() => router.push(`/prize/${prizeId}/submit`)}
                >
                    Create Submission
                </button>
            )}

            {(canManagePrize || canEvaluate) && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-2">Admin/Evaluator Actions</h2>
                    {canManagePrize && (
                        <button
                            className="bg-green-500 text-white px-4 py-2 rounded mr-2"
                            onClick={() => router.push(`/prize/${prizeId}/edit`)}
                        >
                            Edit Prize
                        </button>
                    )}
                    {canEvaluate && (
                        <button
                            className="bg-yellow-500 text-white px-4 py-2 rounded mr-2"
                            onClick={() => router.push(`/prize/${prizeId}/evaluate`)}
                        >
                            Evaluate Submissions
                        </button>
                    )}
                    {canManagePrize && (
                        <button
                            className="bg-purple-500 text-white px-4 py-2 rounded"
                            onClick={handleMoveToNextState}
                        >
                            Move to Next State
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}