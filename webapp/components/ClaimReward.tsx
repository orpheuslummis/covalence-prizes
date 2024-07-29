import { useState } from 'react';
import { usePrizeManager } from '../hooks/usePrizeManager';

interface ClaimRewardProps {
    prizeId: number;
}

export default function ClaimReward({ prizeId }: ClaimRewardProps) {
    const { claimReward } = usePrizeManager();
    const [isLoading, setIsLoading] = useState(false);

    const handleClaim = async () => {
        setIsLoading(true);
        try {
            await claimReward(prizeId);
            alert('Reward claimed successfully!');
        } catch (error) {
            console.error('Failed to claim reward:', error);
            alert('Failed to claim reward. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <button
                onClick={handleClaim}
                className="bg-green-500 text-white p-2 rounded disabled:opacity-50"
                disabled={isLoading}
            >
                {isLoading ? 'Claiming...' : 'Claim Reward'}
            </button>
        </div>
    );
}