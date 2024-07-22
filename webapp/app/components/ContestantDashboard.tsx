import React, { useState } from 'react';
import { useError } from '../ErrorContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import ClaimReward from './ClaimReward';
import PrizeList from './PrizeList';

const ContestantDashboard: React.FC = () => {
    const { prizes, submitContribution } = usePrizeManager();
    const { handleError } = useError();
    const [selectedPrize, setSelectedPrize] = useState<number | null>(null);
    const [contribution, setContribution] = useState('');

    const handleSubmitContribution = async () => {
        if (selectedPrize !== null) {
            try {
                await submitContribution(selectedPrize, contribution);
                setContribution('');
                setSelectedPrize(null);
                // Show success message
            } catch (error) {
                handleError('Failed to submit contribution', error);
            }
        }
    };

    return (
        <div>
            <h2>Contestant Dashboard</h2>
            <PrizeList
                prizes={prizes}
                showActions={true}
                onPrizeSelect={(prize) => setSelectedPrize(prize.id)}
                renderClaimReward={(prizeId) => <ClaimReward prizeId={prizeId} />}
            />
            {selectedPrize !== null && (
                <div>
                    <h3>Submit Contribution</h3>
                    <textarea
                        value={contribution}
                        onChange={(e) => setContribution(e.target.value)}
                        placeholder="Enter your contribution here"
                    />
                    <button onClick={handleSubmitContribution}>Submit</button>
                </div>
            )}
        </div>
    );
};

export default ContestantDashboard;