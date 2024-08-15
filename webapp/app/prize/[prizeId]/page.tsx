'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import ContributionList from '../../../components/ContributionList';
import { Tooltip } from '../../../components/Tooltip';
import { config } from '../../../config';
import { AllocationStrategy, Prize, State } from '../../../types';
import { useAppContext } from '../../AppContext';

export default function PrizePage() {
    const { prizeId } = useParams();
    const { prizeDiamond, prizes, isLoading, isPrizesLoading } = useAppContext();
    const { address, isConnected } = useAccount();
    const router = useRouter();

    useEffect(() => {
        console.log('AppContext state:', { prizes, isLoading, isPrizesLoading });
    }, [prizes, isLoading, isPrizesLoading]);

    const prizeIdBigInt = useMemo(() => {
        const result = typeof prizeId === 'string' ? BigInt(prizeId) : undefined;
        console.log('prizeIdBigInt:', result?.toString());
        return result;
    }, [prizeId]);

    const prize = useMemo(() => {
        return prizes?.find(p => p.id === prizeIdBigInt?.toString());
    }, [prizes, prizeIdBigInt]);

    const { data: prizeDetails, isLoading: isPrizeLoading, error: prizeError } = useQuery({
        queryKey: ['prizeDetails', prizeIdBigInt?.toString()],
        queryFn: async () => {
            if (!prizeIdBigInt) throw new Error("Invalid prize ID");
            console.log('Fetching prize details for ID:', prizeIdBigInt.toString());
            const result = await prizeDiamond.getPrizeDetails(prizeIdBigInt);
            console.log('Fetched prize details:', result);
            return result as Prize;
        },
        enabled: !!prizeIdBigInt && !prize,
        retry: 3,
        retryDelay: 1000,
    });

    const { data: roles, isLoading: isRolesLoading, error: rolesError } = useQuery({
        queryKey: ['prizeRoles', prizeIdBigInt?.toString(), address],
        queryFn: async () => {
            if (!prizeIdBigInt || !address || !prize) throw new Error("Invalid prize ID, address, or prize not found");
            console.log(`Checking roles for prize ${prizeIdBigInt.toString()} and address ${address}`);
            const canSubmit = prize.organizer.toLowerCase() === address.toLowerCase();
            const canEvaluate = await prizeDiamond.isPrizeEvaluator(prizeIdBigInt, address);
            console.log(`Roles for prize ${prizeIdBigInt.toString()}:`, { canSubmit, canEvaluate, canManagePrize: canSubmit });
            return { canSubmit, canEvaluate, canManagePrize: canSubmit };
        },
        enabled: !!prizeIdBigInt && !!address && isConnected && !!prize,
    });

    const { data: currentState, isLoading: isStateLoading } = useQuery({
        queryKey: ['prizeState', prizeIdBigInt?.toString()],
        queryFn: async () => {
            if (!prizeIdBigInt) throw new Error("Invalid prize ID");
            const state = await prizeDiamond.getState(prizeIdBigInt);
            console.log('Current state:', state);
            return state;
        },
        enabled: !!prizeIdBigInt,
    });

    if (isLoading || isPrizesLoading || !prizes) {
        return <div className="text-center py-10 text-purple-100">Loading prize data...</div>;
    }

    if (isPrizeLoading || isRolesLoading || isStateLoading) {
        return <div className="text-center py-10 text-purple-100">Loading prize details...</div>;
    }

    if (prizeError) {
        return <div className="text-center py-10 text-red-300">Error loading prize: {(prizeError as Error).message}</div>;
    }

    if (!prize) {
        return <div className="text-center py-10 text-purple-100">Prize not found. Please check the ID and try again.</div>;
    }

    console.log('Rendering prize data:', prize);

    return (
        <div className="prize-container">
            <div className="prize-header">
                <h1 className="prize-title">{prize.name}</h1>
                <p className="prize-description">{prize.description}</p>
            </div>

            {isConnected && roles && (
                <div className="mt-4 bg-purple-100 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                        <Tooltip
                            content={currentState !== State.Open ? "Submissions are only allowed when the prize is in Open state" : ""}
                            disabled={currentState === State.Open}
                        >
                            <button
                                onClick={() => currentState === State.Open ? router.push(`/prize/${prizeId}/submit`) : null}
                                className={`flex-1 text-center mx-2 px-4 py-2 rounded-md transition-colors ${currentState === State.Open
                                    ? "bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                                    : "bg-gray-400 text-gray-600 cursor-not-allowed"
                                    }`}
                                disabled={currentState !== State.Open}
                            >
                                Create Submission
                            </button>
                        </Tooltip>
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
                    <PrizeDetails prize={prize} />
                    <EvaluationCriteria criteria={prize.criteriaNames || []} />
                </div>
                <div>
                    <PrizeAmount amount={prize.monetaryRewardPool} />
                    <PrizeInPageStatus currentState={currentState || State.Setup} />
                </div>
            </div>

            {prizeIdBigInt && <ContributionList prizeId={prizeIdBigInt} />}
        </div>
    );
}

// Memoize the sub-components
const PrizeDetails = React.memo(({ prize }: {
    prize: Prize;
}) => {
    const formatDate = (timestamp: bigint) => {
        const date = new Date(Number(timestamp) * 1000);
        return date.toISOString().split('T')[0];
    };

    const getStrategyName = (strategy: number) => {
        return AllocationStrategy[strategy] || 'Unknown';
    };

    const explorerUrl = `${config.env.EXPLORER_URL}/address/`;

    return (
        <div className="prize-details-section">
            <h2 className="prize-details-title">Details</h2>
            <div className="prize-details-grid">
                <p><span className="prize-detail-label">Organizer:</span></p>
                <p className="prize-detail-value">
                    <a href={`${explorerUrl}${prize.organizer}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                        {prize.organizer}
                    </a>
                </p>
                <p><span className="prize-detail-label">Created At:</span></p>
                <p className="prize-detail-value">{formatDate(prize.createdAt)}</p>
                <p><span className="prize-detail-label">Allocation Strategy:</span></p>
                <p className="prize-detail-value">{getStrategyName(prize.allocationStrategy)}</p>
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
    const states = Object.values(State).filter(state => typeof state === 'number') as State[];
    const statusColors: Record<State, string> = {
        [State.Setup]: 'bg-yellow-300 text-yellow-800',
        [State.Open]: 'bg-green-300 text-green-800',
        [State.Evaluating]: 'bg-blue-300 text-blue-800',
        [State.Allocating]: 'bg-purple-300 text-purple-800',
        [State.Claiming]: 'bg-orange-300 text-orange-800',
        [State.Closed]: 'bg-gray-300 text-gray-800',
    };

    return (
        <div className="prize-details-section mt-6">
            <h2 className="prize-details-title">Status</h2>
            <div className="space-y-2">
                {states.map((state) => (
                    <div
                        key={state}
                        className={`flex items-center p-2 rounded-md ${currentState === state
                            ? `${statusColors[state]} font-semibold`
                            : 'bg-gray-100 text-gray-500'
                            }`}
                    >
                        <div className={`w-3 h-3 rounded-full mr-2 ${currentState === state ? 'bg-current' : 'bg-gray-300'
                            }`}></div>
                        <span>{State[state]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});