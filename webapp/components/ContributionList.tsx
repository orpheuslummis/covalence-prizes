'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useError } from '../hooks/useError';
import { usePrizeDiamond } from '../hooks/usePrizeDiamond';
import { Contribution } from '../types';
import List from './List';

interface ContributionListProps {
    prizeId: bigint;
    showEvaluated?: boolean;
}

const ContributionList: React.FC<ContributionListProps> = ({ prizeId, showEvaluated = false }) => {
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const { getContribution, getContributionCount } = usePrizeDiamond();
    const { handleError } = useError();

    useEffect(() => {
        const fetchContributions = async () => {
            try {
                const count = await getContributionCount(prizeId);
                const fetchedContributions = await Promise.all(
                    Array.from({ length: Number(count) }, (_, i) =>
                        getContribution(prizeId, BigInt(i))
                    )
                );
                const filteredContributions = fetchedContributions.filter(
                    contribution => contribution.evaluationCount > 0 === showEvaluated
                );
                setContributions(filteredContributions);
            } catch (error) {
                handleError('Failed to fetch contributions', error as Error);
            }
        };
        fetchContributions();
    }, [prizeId, getContributionCount, getContribution, handleError, showEvaluated]);

    const renderContribution = (contribution: Contribution) => {
        return (
            <Link href={`/prize/${prizeId}/submission/${contribution.id}`} className="block">
                <div className="bg-white shadow-md rounded-lg p-6 mb-4 hover:shadow-lg transition-shadow cursor-pointer">
                    <h3 className="text-xl font-semibold mb-2 text-purple-700">{contribution.description}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <p><span className="font-medium">Contestant:</span> {contribution.contestant}</p>
                        <p><span className="font-medium">Evaluations:</span> {contribution.evaluationCount.toString()}</p>
                        {showEvaluated && (
                            <p><span className="font-medium">Claimed:</span> {contribution.claimed ? 'Yes' : 'No'}</p>
                        )}
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-purple-800">
                Contributions
            </h2>
            <List<Contribution>
                items={contributions}
                renderItem={renderContribution}
                emptyMessage={`No ${showEvaluated ? 'evaluated' : 'pending'} contributions available for this prize.`}
            />
        </div>
    );
};

export default ContributionList;