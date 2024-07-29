import React from 'react';
import { useAppContext } from '../app/AppContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import SubmissionCard from './SubmissionCard';

interface PrizePageProps {
    prizeId: number;
}

const PrizePage: React.FC<PrizePageProps> = ({ prizeId }) => {
    const { getPrize, getContributions } = usePrizeManager();
    const { userRoles } = useAppContext();
    const prize = getPrize(prizeId);
    const contributions = getContributions(prizeId);

    if (!prize) return <div>Prize not found</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">{prize.name}</h1>
            <p className="mb-4">{prize.description}</p>
            <div className="mb-6">
                {userRoles.includes('organizer') && (
                    <button className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Manage</button>
                )}
                {userRoles.includes('evaluator') && (
                    <button className="bg-green-500 text-white px-4 py-2 rounded mr-4">Evaluate</button>
                )}
                {userRoles.includes('contestant') && (
                    <button className="bg-purple-500 text-white px-4 py-2 rounded">Submit</button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contributions.map(contribution => (
                    <SubmissionCard key={contribution.id} contribution={contribution} />
                ))}
            </div>
        </div>
    );
};

export default PrizePage;