import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import React from 'react';
import { formatEther } from 'viem';
import { shortenAddress } from '../config';
import { usePrizeDiamond } from '../hooks/usePrizeDiamond';
import { Prize, State } from '../types';

interface PrizeCardProps {
    prize: Prize;
}

const PrizeCard: React.FC<PrizeCardProps> = React.memo(({ prize }) => {
    const { getState, getPrizeDetails } = usePrizeDiamond();

    const { data: currentState, isLoading: isStateLoading } = useQuery({
        queryKey: ['prizeState', prize.id],
        queryFn: () => getState(BigInt(prize.id)),
    });

    const { data: prizeDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: ['prizeDetails', prize.id],
        queryFn: () => getPrizeDetails(BigInt(prize.id)),
    });

    const statusColors: Record<State, string> = {
        [State.Setup]: 'bg-yellow-300 text-yellow-800',
        [State.Open]: 'bg-green-300 text-green-800',
        [State.Evaluating]: 'bg-blue-300 text-blue-800',
        [State.Allocating]: 'bg-purple-300 text-purple-800',
        [State.Claiming]: 'bg-indigo-300 text-indigo-800',
        [State.Closed]: 'bg-gray-300 text-gray-800',
    };

    const generateGradient = (prizeData: Prize) => {
        const hash = prizeData.id.toString() || prizeData.name;
        const seed = hash.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

        const hue1 = seed % 360;
        const hue2 = (hue1 + 40) % 360;
        const saturation = 80 + (seed % 20);
        const lightness1 = 25 + (seed % 20);
        const lightness2 = lightness1 + 10;

        return `linear-gradient(135deg, 
                hsl(${hue1}, ${saturation}%, ${lightness1}%), 
                hsl(${hue2}, ${saturation}%, ${lightness2}%))`;
    };

    const gradientStyle = {
        background: generateGradient(prize),
    };

    const formattedReward = prizeDetails && prizeDetails.monetaryRewardPool
        ? parseFloat(formatEther(BigInt(prizeDetails.monetaryRewardPool)))
        : 0;
    const formattedCreatedDate = prize.createdAt
        ? new Date(Number(prize.createdAt) * 1000).toISOString().split('T')[0]
        : 'N/A';

    const formatCriteria = (criteria: string[]) => {
        const maxLength = 69;
        let result = criteria.join(', ');
        if (result.length > maxLength) {
            result = result.substring(0, maxLength) + '...';
        }
        return result;
    };

    if (isStateLoading || isDetailsLoading) {
        return <div className="prize-card loading">Loading...</div>;
    }

    return (
        <Link href={`/prize/${prize.id}`}>
            <div className="prize-card">
                <div className="prize-card-header" style={gradientStyle}>
                    <div className="relative z-10">
                        <h2 className="prize-card-title">{prizeDetails?.name || prize.name}</h2>
                        <p className="prize-card-description">{prize.description}</p>
                    </div>
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </div>

                <div className="prize-card-body">
                    <div className="prize-card-grid">
                        <div>
                            <p className="prize-card-label">Organizer</p>
                            <p className="prize-card-value">{prizeDetails?.organizer ? shortenAddress(prizeDetails.organizer) : 'Not specified'}</p>
                        </div>
                        <div>
                            <p className="prize-card-label">Strategy</p>
                            <p className="prize-card-value">{prizeDetails?.allocationStrategy || 'Not specified'}</p>
                        </div>
                    </div>

                    <div>
                        <p className="prize-card-label mb-1">Criteria</p>
                        <p className="prize-card-value text-sm">{formatCriteria(prizeDetails?.criteriaNames || [])}</p>
                    </div>

                    <div className="prize-card-reward">
                        <p className="prize-card-label mb-1">Reward Pool</p>
                        <p className="prize-card-reward-value">{formattedReward.toFixed(6)} ETH</p>
                    </div>

                    <div className="prize-card-footer">
                        <div>
                            <p className="prize-card-label">Created</p>
                            <p className="text-purple-700">{formattedCreatedDate}</p>
                        </div>
                        <div className={`prize-card-status ${statusColors[currentState as State || State.Setup]}`}>
                            {State[currentState as State || State.Setup]}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
});

export default PrizeCard;