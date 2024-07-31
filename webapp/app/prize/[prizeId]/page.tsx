'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { Address, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { config, shortenAddress } from '../../../config';
import { usePrizeContract } from '../../../hooks/usePrizeContract';
import { usePrizeManager } from '../../../hooks/usePrizeManager';
import { useAppContext } from '../../AppContext';
import { State } from '../../types';

export default function PrizePage() {
    const { prizeId } = useParams();
    const { getPrize } = usePrizeManager();
    const { data: prize, isLoading: isPrizeLoading, error: prizeError } = getPrize(prizeId as string);
    const {
        roles,
        isLoadingRoles,
        currentState,
        monetaryRewardPool,
        getName,
        getOrganizer,
        description,
        criteriaNames,
        createdAt,
        strategy,
    } = usePrizeContract(prize?.prizeAddress as `0x${string}`);
    const { address, isConnected } = useAccount();
    const { contracts } = useAppContext();

    // Memoize the rendered content
    const content = useMemo(() => {
        if (isPrizeLoading || isLoadingRoles) return <div className="text-center py-10 text-purple-100">Loading prize...</div>;
        if (prizeError) return <div className="text-center py-10 text-red-300">Error: {prizeError.message}</div>;
        if (!prize) return <div className="text-center py-10 text-purple-100">Prize not found</div>;

        return (
            <div className="prize-container">
                <div className="prize-header">
                    <h1 className="prize-title">{getName || prize.name}</h1>
                    <p className="prize-description">{description || prize.description}</p>
                </div>

                {isConnected && (
                    <div className="mt-4 bg-purple-100 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            {roles.canSubmit && currentState === State.Open && (
                                <Link href={`/prize/${prizeId}/submit`} className="flex-1 text-center mx-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors">
                                    Create Submission
                                </Link>
                            )}
                            {roles.canEvaluate && currentState === State.Evaluating && (
                                <Link href={`/prize/${prizeId}/evaluate`} className="flex-1 text-center mx-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
                                    Evaluate Submissions
                                </Link>
                            )}
                            {roles.canManagePrize && (
                                <Link href={`/prize/${prizeId}/manage`} className="flex-1 text-center mx-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors">
                                    Manage Prize
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
                            organizer={getOrganizer || prize.organizer}
                            createdAt={createdAt || prize.createdAt}
                            strategy={strategy || prize.allocationStrategy}
                            prizeAddress={prize.prizeAddress}
                        />
                        <EvaluationCriteria criteria={criteriaNames || prize.criteriaNames || []} />
                    </div>
                    <div>
                        <PrizeAmount amount={monetaryRewardPool || prize.pool} />
                        <PrizeInPageStatus currentState={currentState} />
                    </div>
                </div>

                {/* New components */}
                <SubmissionsList prizeAddress={prize.prizeAddress as Address} currentState={currentState} />
                <EvaluatorsList prizeAddress={prize.prizeAddress as Address} currentState={currentState} />
            </div>
        );
    }, [isPrizeLoading, isLoadingRoles, prizeError, prize, roles, isConnected, prizeId, currentState, monetaryRewardPool, getName, getOrganizer, description, criteriaNames, createdAt, strategy]);

    return content;
}

// Memoize the sub-components
const PrizeDetails = React.memo(({ organizer, createdAt, strategy, prizeAddress }: {
    organizer: string;
    createdAt: Date | bigint;
    strategy: string;
    prizeAddress: string;
}) => {
    const formatDate = (timestamp: number | string | Date | bigint) => {
        let date: Date;
        if (timestamp instanceof Date) {
            date = timestamp;
        } else if (typeof timestamp === 'number') {
            date = new Date(timestamp * 1000); // Convert seconds to milliseconds
        } else if (typeof timestamp === 'bigint') {
            date = new Date(Number(timestamp) * 1000); // Convert BigInt to number, then to milliseconds
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
});

const EvaluationCriteria = React.memo(({ criteria }: { criteria: string[] }) => {
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
});

const PrizeAmount = React.memo(({ amount }: { amount: bigint }) => {
    return (
        <div className="prize-amount-section">
            <h2 className="prize-details-title">Amount</h2>
            <div className="prize-amount-value">
                <p className="prize-amount-text">{formatEther(amount || 0n)} ETH</p>
            </div>
        </div>
    );
});

const PrizeInPageStatus = React.memo(({ currentState }: { currentState: State }) => {
    const states = [State.Setup, State.Open, State.Evaluating, State.Rewarding, State.Closed];
    const statusColors = {
        [State.Setup]: 'bg-yellow-300 text-yellow-800',
        [State.Open]: 'bg-green-300 text-green-800',
        [State.Evaluating]: 'bg-blue-300 text-blue-800',
        [State.Rewarding]: 'bg-purple-300 text-purple-800',
        [State.Closed]: 'bg-gray-300 text-gray-800',
    };

    return (
        <div className="prize-details-section mt-6">
            <h2 className="prize-details-title">Status</h2>
            <div className="space-y-2">
                {states.map((state) => (
                    <div key={state} className={`flex items-center ${currentState === state ? 'font-semibold' : 'opacity-50'}`}>
                        <div className={`w-3 h-3 rounded-full mr-2 ${statusColors[state]}`}></div>
                        <span className={`prize-status-text ${statusColors[state]}`}>{State[state]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

const SubmissionsList = React.memo(({ prizeAddress, currentState }: { prizeAddress: Address, currentState: State }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { publicClient } = useAppContext();

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (currentState >= 1) {
                try {
                    const events = await publicClient.getContractEvents({
                        address: prizeAddress,
                        abi: config.contracts.PrizeContract.abi,
                        eventName: 'SubmissionAdded',
                        fromBlock: 0n,
                        toBlock: 'latest'
                    });

                    const formattedSubmissions = events.map((event, index) => {
                        const submitter = event.args?.submitter;
                        const submissionId = event.args?.submissionId;
                        return {
                            submitter: submitter ? submitter.toString() : 'Unknown',
                            submissionId: submissionId ? submissionId.toString() : `Unknown-${index}`
                        };
                    });

                    setSubmissions(formattedSubmissions);
                } catch (error) {
                    console.error('Error fetching submissions:', error);
                }
            }
            setIsLoading(false);
        };

        fetchSubmissions();
    }, [prizeAddress, currentState, publicClient, config]);

    if (isLoading) {
        return <div>Loading submissions...</div>;
    }

    return (
        <div>
            <h3>Submissions</h3>
            {submissions.length === 0 ? (
                <p>No submissions yet.</p>
            ) : (
                <ul>
                    {submissions.map((submission) => (
                        <li key={submission.submissionId}>
                            Submitter: {shortenAddress(submission.submitter)}, ID: {submission.submissionId}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});

const EvaluatorsList = React.memo(({ prizeAddress, currentState }: { prizeAddress: Address, currentState: State }) => {
    const [evaluators, setEvaluators] = useState<Address[]>([]);
    const { publicClient } = useAppContext();
    const { contracts } = useAppContext();

    useEffect(() => {
        const fetchEvaluators = async () => {
            if (currentState < State.Evaluating) return; // Only fetch evaluators if the prize is in Evaluating state or later

            try {
                const evaluatorRole = contracts.PrizeContract.roles.EVALUATOR_ROLE;
                const evaluatorEvents = await publicClient.getContractEvents({
                    address: prizeAddress,
                    abi: contracts.PrizeContract.abi,
                    eventName: 'RoleGranted',
                    args: {
                        role: evaluatorRole,
                    },
                    fromBlock: 'earliest',
                    toBlock: 'latest',
                });

                const evaluatorAddresses = evaluatorEvents.map(event => (event.args as any).account as Address);
                setEvaluators(evaluatorAddresses);
            } catch (error) {
                console.error('Error fetching evaluators:', error);
            }
        };

        fetchEvaluators();
    }, [prizeAddress, currentState, publicClient, contracts.PrizeContract.abi, contracts.PrizeContract.roles.EVALUATOR_ROLE]);

    if (currentState < State.Evaluating) {
        return null; // Don't render anything if the prize is not yet in Evaluating state
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Evaluators</h2>
            {evaluators.length === 0 ? (
                <p>No evaluators assigned yet.</p>
            ) : (
                <ul className="space-y-2">
                    {evaluators.map((evaluator, index) => (
                        <li key={index} className="bg-blue-100 p-2 rounded">
                            {shortenAddress(evaluator)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});