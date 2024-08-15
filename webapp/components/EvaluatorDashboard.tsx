import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../app/AppContext';
import { useError } from '../app/ErrorContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { Prize, Submission } from '../types';
import SubmissionList from './SubmissionList';

const EvaluatorDashboard: React.FC = () => {
    const { user, web3 } = useAppContext();
    const { handleError } = useError();
    const [prize, setPrize] = useState<Prize | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { getPrizes, getContributions, assignScores } = usePrizeManager();

    if (!web3.isConnected) {
        return <div>Please connect your wallet to view the evaluator dashboard.</div>;
    }

    const fetchPrizeAndSubmissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const prizeId = new URLSearchParams(window.location.search).get('prize');
            if (!prizeId) throw new Error('No prize ID provided');

            const prizes = await getPrizes();
            const fetchedPrize = prizes.find(p => p.id === prizeId);
            if (!fetchedPrize) throw new Error('Prize not found');
            setPrize(fetchedPrize);

            const fetchedSubmissions = await getContributions(Number(prizeId));
            setSubmissions(fetchedSubmissions);
        } catch (err) {
            handleError('Failed to fetch prize and submissions', err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [getPrizes, getContributions, handleError]);

    useEffect(() => {
        fetchPrizeAndSubmissions();
    }, [fetchPrizeAndSubmissions]);

    const handleScoreSubmit = useCallback(async (scores: { [id: number]: number }, comments: { [id: number]: string }) => {
        if (prize) {
            try {
                const contestants = Object.keys(scores).map(Number);
                const scoreValues = contestants.map(id => [scores[id]]);
                await assignScores(Number(prize.id), contestants.map(String), scoreValues);
                await fetchPrizeAndSubmissions();
            } catch (err) {
                handleError('Failed to assign scores', err as Error);
            }
        }
    }, [prize, assignScores, handleError, fetchPrizeAndSubmissions]);

    if (isLoading) return <div>Loading prize details...</div>;

    if (!prize) return <div>No prize found.</div>;

    return (
        <div>
            <h2>Evaluator Dashboard</h2>
            <h3>Hi {user?.name}, welcome to {prize.name} Evaluation!</h3>
            <SubmissionList
                submissions={submissions}
                onScoreSubmit={handleScoreSubmit}
            />
        </div>
    );
};

export default EvaluatorDashboard;