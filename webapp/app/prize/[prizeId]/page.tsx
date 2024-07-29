'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { usePrizeManager } from '../../../hooks/usePrizeManager';
import { useRoleBasedAccess } from '../../../hooks/useRoleBasedAccess';
import { Prize, PrizeStatus } from '../../types';

export default function PrizePage() {
    const { prizeId } = useParams();
    const { getPrize, getPrizeState } = usePrizeManager();
    const { canCreatePrize, canEvaluate, canSubmit, canManagePrize } = useRoleBasedAccess();
    const [prize, setPrize] = useState<Prize | null>(null);
    const [prizeState, setPrizeState] = useState<PrizeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrizeDetails = async () => {
            if (prizeId && typeof prizeId === 'string') {
                try {
                    setLoading(true);
                    setError(null);
                    const fetchedPrize = await getPrize(prizeId);
                    if (fetchedPrize) {
                        setPrize(fetchedPrize);
                        const state = await getPrizeState(prizeId);
                        setPrizeState(state);
                        console.log('Fetched Prize:', fetchedPrize);
                        console.log('Prize State:', state);
                    } else {
                        setError('Prize not found');
                    }
                } catch (err) {
                    console.error('Error fetching prize:', err);
                    setError('Failed to fetch prize details');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchPrizeDetails();
    }, [prizeId, getPrize, getPrizeState]);

    if (loading) return <div className="text-center py-10 text-purple-800">Loading...</div>;
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    if (!prize) return <div className="text-center py-10 text-purple-800">Prize not found</div>;

    return (
        <div className="prize-container">
            <div className="prize-header">
                <h1 className="prize-title">{prize.name}</h1>
                <p className="prize-description">{prize.description}</p>
            </div>

            <div className="prize-grid">
                <div className="md:col-span-2">
                    <PrizeDetails prize={prize} />
                    <EvaluationCriteria criteria={prize.criteriaNames} />
                </div>
                <div>
                    <PrizeAmount amount={parseFloat(formatEther(prize.pool))} />
                    <PrizeInPageStatus currentState={prizeState} />
                </div>
            </div>

            <div className="prize-actions mt-6 flex flex-wrap gap-4 justify-center">
                {canSubmit() && (
                    <Link href={`/prize/submit/${prizeId}`} className="prize-action-button">
                        Create Submission
                    </Link>
                )}
                {canManagePrize(prize.prizeAddress) && (
                    <Link href={`/prize/manage/${prizeId}`} className="prize-action-button">
                        Manage
                    </Link>
                )}
                {canEvaluate(prize.prizeAddress) && (
                    <Link href={`/prize/evaluate/${prizeId}`} className="prize-action-button">
                        Evaluate
                    </Link>
                )}
            </div>
        </div>
    );
}

function PrizeDetails({ prize }: { prize: Prize }) {
    return (
        <div className="prize-details-section">
            <h2 className="prize-details-title">Details</h2>
            <div className="prize-details-grid">
                <div>
                    <p className="prize-detail-label">Organizer:</p>
                    <p className="prize-detail-value">{prize.organizer}</p>
                </div>
                <div>
                    <p className="prize-detail-label">Created At:</p>
                    <p className="prize-detail-value">{new Date(prize.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                    <p className="prize-detail-label">Allocation Strategy:</p>
                    <p className="prize-detail-value">{prize.allocationStrategy}</p>
                </div>
                <div>
                    <p className="prize-detail-label">Prize Address:</p>
                    <p className="prize-detail-value">{prize.prizeAddress}</p>
                </div>
            </div>
        </div>
    );
}

function EvaluationCriteria({ criteria }: { criteria: string[] }) {
    return (
        <div className="bg-purple-100 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4 text-purple-800">Evaluation Criteria</h2>
            {criteria && criteria.length > 0 ? (
                <ul className="list-disc pl-5">
                    {criteria.map((criterion, index) => (
                        <li key={index} className="mb-2 text-purple-900">{criterion}</li>
                    ))}
                </ul>
            ) : (
                <p className="text-purple-700">No evaluation criteria specified.</p>
            )}
        </div>
    );
}

function PrizeAmount({ amount }: { amount: number }) {
    return (
        <div className="prize-amount-section">
            <h2 className="prize-details-title">Amount</h2>
            <div className="prize-amount-value">
                <p className="prize-amount-text">
                    {amount.toFixed(6)} ETH
                </p>
            </div>
        </div>
    );
}

function PrizeInPageStatus({ currentState }: { currentState: PrizeStatus | null }) {
    const states = [PrizeStatus.Setup, PrizeStatus.Open, PrizeStatus.Evaluating, PrizeStatus.Rewarding, PrizeStatus.Closed];

    return (
        <div className="prize-status-indicator">
            <h2 className="prize-details-title">Status</h2>
            <div className="flex flex-col items-start">
                {states.map((state) => (
                    <div key={state} className="flex items-center mb-2">
                        <div className={`prize-status-indicator ${currentState !== null && state <= currentState ? 'bg-purple-600' : 'bg-purple-300'} mr-2`}></div>
                        <span className={`prize-status-text ${currentState === state ? 'font-bold text-purple-900' : 'text-purple-700'}`}>{PrizeStatus[state]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}