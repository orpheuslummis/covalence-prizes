'use client';

import Link from 'next/link';
import React from 'react';
import { Prize } from '../types';
import List from './List';

interface PrizeListProps {
    prizes: Prize[];
    showActions?: boolean;
    onPrizeSelect?: (prize: Prize) => void;
    renderClaimReward?: (prizeId: number) => React.ReactNode;
}

const PrizeList: React.FC<PrizeListProps> = ({ prizes, showActions = false, onPrizeSelect, renderClaimReward }) => {
    const renderPrize = (prize: Prize) => (
        <>
            <h3 className="text-lg font-semibold">{prize.name}</h3>
            <p>{prize.description}</p>
            <p>Amount: {prize.totalRewardPool} ETH</p>
            <p>State: <span className={`font-semibold ${prize.active ? 'text-green-500' : 'text-red-500'}`}>
                {prize.state}
            </span></p>
            {showActions && (
                <div className="mt-2">
                    {prize.active && onPrizeSelect && (
                        <button
                            onClick={() => onPrizeSelect(prize)}
                            className="mr-2 px-2 py-1 bg-blue-500 text-white rounded"
                        >
                            Submit Contribution
                        </button>
                    )}
                    {!prize.active && !prize.claimed && renderClaimReward && renderClaimReward(prize.id)}
                    {prize.claimed && <span className="text-gray-500">Reward Claimed</span>}
                </div>
            )}
            <Link href={`/prizes/${prize.id}`} className="block mt-2 text-blue-500">View Details</Link>
        </>
    );

    return (
        <List
            items={prizes}
            renderItem={renderPrize}
            emptyMessage="No prizes available. Please connect your wallet or check back later."
        />
    );
};

export default PrizeList;