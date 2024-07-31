import Link from 'next/link';
import React from 'react';
import { formatEther } from 'viem';
import { Prize, State } from '../app/types';
import { shortenAddress } from '../config';
import { usePrizeContract } from '../hooks/usePrizeContract';

interface PrizeCardProps {
    prize: Prize;
}

const PrizeCard: React.FC<PrizeCardProps> = React.memo(({ prize }) => {
    const { currentState, monetaryRewardPool, getName, getOrganizer } = usePrizeContract(prize.prizeAddress as `0x${string}`);

    const statusColors = {
        [State.Setup]: 'bg-yellow-300 text-yellow-800',
        [State.Open]: 'bg-green-300 text-green-800',
        [State.Evaluating]: 'bg-blue-300 text-blue-800',
        [State.Rewarding]: 'bg-purple-300 text-purple-800',
        [State.Closed]: 'bg-gray-300 text-gray-800',
    };

    const generateGradient = (prizeData: Prize) => {
        const hash = prizeData.prizeAddress || prizeData.name;
        const seed = hash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Generate more vibrant, darker colors
        const hue1 = seed % 360;
        const hue2 = (hue1 + 40) % 360;
        const saturation = 80 + (seed % 20); // Higher saturation
        const lightness1 = 25 + (seed % 20); // Darker base
        const lightness2 = lightness1 + 10; // Slightly lighter end

        return `linear-gradient(135deg, 
            hsl(${hue1}, ${saturation}%, ${lightness1}%), 
            hsl(${hue2}, ${saturation}%, ${lightness2}%))`;
    };

    const gradientStyle = {
        background: generateGradient(prize),
    };

    const formattedReward = monetaryRewardPool ? parseFloat(formatEther(monetaryRewardPool)) : 0;
    const formattedCreatedDate = new Date(prize.createdAt).toISOString().split('T')[0];

    const formatCriteria = (criteria: string[]) => {
        const maxLength = 69;
        let result = criteria.join(', ');
        if (result.length > maxLength) {
            result = result.substring(0, maxLength) + '...';
        }
        return result;
    };

    return (
        <Link href={`/prize/${prize.prizeAddress || ''}`}>
            <div className="prize-card">
                <div className="prize-card-header" style={gradientStyle}>
                    <div className="relative z-10">
                        <h2 className="prize-card-title">{getName || prize.name}</h2>
                        <p className="prize-card-description">{prize.description}</p>
                    </div>
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </div>

                <div className="prize-card-body">
                    <div className="prize-card-grid">
                        <div>
                            <p className="prize-card-label">Organizer</p>
                            <p className="prize-card-value">{getOrganizer ? shortenAddress(getOrganizer) : 'Not specified'}</p>
                        </div>
                        <div>
                            <p className="prize-card-label">Strategy</p>
                            <p className="prize-card-value">{prize.allocationStrategy || 'Not specified'}</p>
                        </div>
                    </div>

                    <div>
                        <p className="prize-card-label mb-1">Criteria</p>
                        <p className="prize-card-value text-sm">{formatCriteria(prize.criteriaNames)}</p>
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
                        <div className={`prize-card-status ${statusColors[currentState]}`}>
                            {State[currentState]}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
});

export default PrizeCard;