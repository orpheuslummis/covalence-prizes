'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { usePrizeContract } from '../../../hooks/usePrizeContract';
import { usePrizeManager } from '../../../hooks/usePrizeManager';
import { State } from '../../types';

export default function PrizePage() {
    const { prizeId } = useParams();
    const { getPrize } = usePrizeManager();
    const { data: prize, isLoading: isPrizeLoading, error: prizeError } = getPrize(prizeId as string);
    const { roles, isLoadingRoles } = usePrizeContract(prize?.prizeAddress as `0x${string}`);
    const { address, isConnected } = useAccount();

    if (isPrizeLoading || isLoadingRoles) return <div className="text-center py-10 text-purple-100">Loading...</div>;
    if (prizeError) return <div className="text-center py-10 text-red-300">Error: {prizeError.message}</div>;
    if (!prize) return <div className="text-center py-10 text-purple-100">Prize not found</div>;

    console.log('Prize details:', prize);
    console.log('User roles:', roles);

    return (
        <div className="prize-container">
            <div className="prize-header">
                <h1 className="prize-title">{prize.name}</h1>
                <p className="prize-description">{prize.description}</p>
            </div>

            {isConnected && (
                <div className="mt-4 bg-purple-100 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                        {roles.canSubmit && (
                            <Link href={`/prize/${prizeId}/submit`} className="prize-action-button flex-1 text-center mx-2">
                                Create Submission
                            </Link>
                        )}
                        {roles.canManagePrize && (
                            <Link href={`/prize/${prizeId}/manage`} className="prize-action-button flex-1 text-center mx-2">
                                Manage Prize
                            </Link>
                        )}
                        {roles.canEvaluate && (
                            <Link href={`/prize/${prizeId}/evaluate`} className="prize-action-button flex-1 text-center mx-2">
                                Evaluate Submissions
                            </Link>
                        )}
                    </div>
                </div>
            )}
            {!isConnected && (
                <div className="mt-4 text-center text-purple-600 bg-purple-100 p-4 rounded-lg">
                    Connect your wallet to interact with this prize.
                </div>
            )}

            <div className="prize-grid mt-8">
                <div className="md:col-span-2">
                    <PrizeDetails
                        organizer={prize.organizer}
                        createdAt={prize.createdAt}
                        strategy={prize.allocationStrategy}
                        prizeAddress={prize.prizeAddress}
                    />
                    <EvaluationCriteria criteria={prize.criteriaNames || []} />
                </div>
                <div>
                    <PrizeAmount amount={prize.pool} />
                    <PrizeInPageStatus currentState={prize.status} />
                </div>
            </div>
        </div>
    );
}

function PrizeDetails({ organizer, createdAt, strategy, prizeAddress }: {
    organizer: string;
    createdAt: Date;
    strategy: string;
    prizeAddress: string;
}) {
    const formatDate = (timestamp: number | string | Date) => {
        let date: Date;
        if (timestamp instanceof Date) {
            date = timestamp;
        } else if (typeof timestamp === 'number') {
            date = new Date(timestamp * 1000); // Convert seconds to milliseconds
        } else {
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    };

    return (
        <div className="prize-details-section">
            <h2 className="prize-details-title">Details</h2>
            <div className="prize-details-grid">
                <p><span className="prize-detail-label">Organizer:</span></p>
                <p className="prize-detail-value">{organizer}</p>
                <p><span className="prize-detail-label">Created At:</span></p>
                <p className="prize-detail-value">{formatDate(createdAt)}</p>
                <p><span className="prize-detail-label">Allocation Strategy:</span></p>
                <p className="prize-detail-value">{strategy}</p>
                <p><span className="prize-detail-label">Prize Address:</span></p>
                <p className="prize-detail-value">{prizeAddress}</p>
            </div>
        </div>
    );
}

function EvaluationCriteria({ criteria }: { criteria: string[] }) {
    return (
        <div className="prize-details-section mt-6">
            <h2 className="prize-details-title">Evaluation Criteria</h2>
            {criteria && criteria.length > 0 ? (
                <ul className="list-disc pl-5">
                    {criteria.map((criterion, index) => (
                        <li key={index} className="text-purple-700">{criterion}</li>
                    ))}
                </ul>
            ) : (
                <p className="text-purple-700">No evaluation criteria specified.</p>
            )}
        </div>
    );
}

function PrizeAmount({ amount }: { amount: bigint }) {
    return (
        <div className="prize-amount-section">
            <h2 className="prize-details-title">Amount</h2>
            <div className="prize-amount-value">
                <p className="prize-amount-text">{formatEther(amount || 0n)} ETH</p>
            </div>
        </div>
    );
}

function PrizeInPageStatus({ currentState }: { currentState: State }) {
    const states = [State.Setup, State.Open, State.Evaluating, State.Rewarding, State.Closed];
    return (
        <div className="prize-details-section mt-6">
            <h2 className="prize-details-title">Status</h2>
            <div className="space-y-2">
                {states.map((state) => (
                    <div key={state} className={`flex items-center ${currentState === state ? 'text-purple-800 font-semibold' : 'text-purple-600'}`}>
                        <div className={`prize-status-indicator ${currentState === state ? 'bg-purple-600' : 'bg-purple-300'}`}></div>
                        <span className="prize-status-text">{State[state]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}