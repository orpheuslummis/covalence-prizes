import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { useError } from '../ErrorContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { Prize } from '../types';
import ContributionList from './ContributionList';
import PrizeList from './PrizeList';

const MemoizedPrizeList = React.memo(PrizeList);

const EvaluatorDashboard: React.FC = () => {
    const { web3 } = useAppContext();
    const { handleError } = useError();
    const [assignedPrizes, setAssignedPrizes] = useState<Prize[]>([]);
    const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { getPrizes, assignScores } = usePrizeManager();

    const fetchPrizes = useCallback(async () => {
        if (!web3 || !web3.isConnected || !web3.isInitialized) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const allPrizes = await getPrizes();
            const evaluatingPrizes = allPrizes.filter(
                (prize: Prize) => prize.active && !prize.claimed
            );
            setAssignedPrizes(evaluatingPrizes);
        } catch (err) {
            handleError('Failed to fetch prizes', err);
        } finally {
            setIsLoading(false);
        }
    }, [getPrizes, handleError, web3]);

    useEffect(() => {
        if (web3 && web3.isConnected && web3.isInitialized) {
            fetchPrizes();
        }
    }, [web3, fetchPrizes]);

    const handleScoreAssign = useCallback(async (contributionId: number, score: number) => {
        if (selectedPrize) {
            try {
                await assignScores(selectedPrize.id, [contributionId.toString()], [[score]]);
                await fetchPrizes();
            } catch (err) {
                handleError('Failed to assign score', err);
            }
        }
    }, [selectedPrize, assignScores, handleError, fetchPrizes]);

    if (!web3 || !web3.isConnected) {
        return <div>Please connect your wallet to view the Evaluator Dashboard.</div>;
    }

    if (isLoading) return <div>Loading prizes...</div>;

    return (
        <div>
            <h2>Evaluator Dashboard</h2>
            <MemoizedPrizeList
                prizes={assignedPrizes}
                showActions={true}
                onPrizeSelect={setSelectedPrize}
            />
            {selectedPrize && (
                <ContributionList
                    prizeId={selectedPrize.id}
                    onScoreAssign={handleScoreAssign}
                />
            )}
        </div>
    );
};

export default EvaluatorDashboard;