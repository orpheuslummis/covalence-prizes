'use client';

import React, { useEffect, useState } from 'react';
import { useError } from '../app/ErrorContext';
import { Contribution } from '../app/types';
import { usePrizeManager } from '../hooks/usePrizeManager';
import List from './List';

interface ContributionListProps {
    prizeId: number;
    onScoreAssign: (contributionId: number, score: number) => Promise<void>;
}

const ContributionList: React.FC<ContributionListProps> = ({ prizeId, onScoreAssign }) => {
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const { getContributions } = usePrizeManager();
    const { handleError } = useError();

    useEffect(() => {
        const fetchContributions = async () => {
            try {
                const fetchedContributions = await getContributions(prizeId);
                if (fetchedContributions) {
                    setContributions(fetchedContributions);
                }
            } catch (error) {
                handleError('Failed to fetch contributions', error);
            }
        };
        fetchContributions();
    }, [prizeId, getContributions, handleError]);

    const renderContribution = (contribution: Contribution) => (
        <div className="border p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold">{contribution.description}</h3>
            <p className="text-sm text-gray-600">Contestant: {contribution.contestant}</p>
            <input
                type="number"
                min="0"
                max="100"
                className="mt-2 p-2 border rounded w-full"
                placeholder="Enter score (0-100)"
                onChange={(e) => onScoreAssign(contribution.id, parseInt(e.target.value, 10))}
            />
        </div>
    );

    return (
        <List
            items={contributions}
            renderItem={renderContribution}
            emptyMessage="No contributions available for this prize."
        />
    );
};

export default ContributionList;