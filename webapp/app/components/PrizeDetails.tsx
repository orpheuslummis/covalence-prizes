import React, { useEffect, useState } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { useRoleBasedAccess } from '../hooks/useRoleBasedAccess';
import { Prize, PrizeStatus } from '../types';
import PrizeState from './PrizeState';

interface PrizeDetailsProps {
    prizeId: number;
}

const PrizeDetails: React.FC<PrizeDetailsProps> = ({ prizeId }) => {
    const access = useRoleBasedAccess();
    const { prizes, submitContribution, claimReward, loading: prizeManagerLoading, error: prizeManagerError, addEvaluators, assignCriteriaWeights } = usePrizeManager();
    const { handleError } = useErrorHandler();
    const [prize, setPrize] = useState<Prize | undefined>(prizes.find(p => p.id === prizeId));
    const [contribution, setContribution] = useState('');
    const [evaluators, setEvaluators] = useState('');
    const [criteriaWeights, setCriteriaWeights] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPrize(prizes.find(p => p.id === prizeId));
    }, [prizes, prizeId]);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    if (prizeManagerLoading) return <div>Loading prize details...</div>;
    if (prizeManagerError) return <div>Error: {prizeManagerError instanceof Error ? prizeManagerError.message : String(prizeManagerError)}</div>;
    if (!prize) return <div>Prize not found</div>;

    const handleAction = async (action: () => Promise<void>, successMessage: string) => {
        setLoading(true);
        try {
            await action();
            setFeedback({ type: 'success', message: successMessage });
        } catch (error) {
            handleError('Action failed', error);
            setFeedback({ type: 'error', message: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitContribution = () => handleAction(async () => {
        await submitContribution(prizeId, contribution);
        setContribution('');
    }, 'Contribution submitted successfully!');

    const handleClaimReward = () => handleAction(async () => {
        await claimReward(prizeId);
    }, 'Reward claimed successfully!');

    const handleAddEvaluators = () => handleAction(async () => {
        const evaluatorList = evaluators.split(',').map(e => e.trim());
        await addEvaluators(prizeId, evaluatorList);
        setEvaluators('');
    }, 'Evaluators added successfully!');

    const handleAssignCriteriaWeights = () => handleAction(async () => {
        const weights = criteriaWeights.split(',').map(w => parseInt(w.trim()));
        await assignCriteriaWeights(prizeId, weights);
        setCriteriaWeights('');
    }, 'Criteria weights assigned successfully!');

    const renderStateSpecificActions = () => {
        return (
            <>
                <PrizeState
                    prizeId={prizeId}
                    currentState={prize.state || PrizeStatus.Setup}
                    onStateChange={(newState) => setPrize(prev => prev ? { ...prev, state: newState } : undefined)}
                />
                {access.canAddEvaluators && (
                    <div className="mb-4">
                        <input
                            type="text"
                            value={evaluators}
                            onChange={(e) => setEvaluators(e.target.value)}
                            placeholder="Enter evaluator addresses, comma-separated"
                            className="w-full p-2 border rounded"
                        />
                        <button onClick={handleAddEvaluators} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">Add Evaluators</button>
                    </div>
                )}
                {access.canAssignCriteriaWeights && (
                    <div className="mb-4">
                        <input
                            type="text"
                            value={criteriaWeights}
                            onChange={(e) => setCriteriaWeights(e.target.value)}
                            placeholder="Enter criteria weights, comma-separated"
                            className="action-input"
                        />
                        <button onClick={handleAssignCriteriaWeights} className="action-button">Assign Criteria Weights</button>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="prize-details max-w-2xl mx-auto p-4">
            {feedback && (
                <div className={`p-4 mb-4 rounded ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {feedback.message}
                </div>
            )}
            {loading && <div className="text-center">Loading...</div>}
            <h2 className="text-2xl font-bold mb-4">{prize.name}</h2>
            <p className="description mb-4">{prize.description}</p>
            <div className="prize-info mb-4">
                <p>Total Reward Pool: {prize.totalRewardPool} ETH</p>
                <p>Current State: <span className="font-semibold">{prize.state}</span></p>
                <p>Active: {prize.active ? 'Yes' : 'No'}</p>
            </div>
            <div className="state-actions mb-4">
                <h3 className="text-xl font-semibold mb-2">Available Actions</h3>
                {renderStateSpecificActions()}
            </div>
            {prize.state === PrizeStatus.Open && (
                <div className="contribution-section mb-4">
                    <h3 className="text-xl font-semibold mb-2">Submit Your Contribution</h3>
                    <p>Contributions are currently being accepted for this prize.</p>
                </div>
            )}
            {prize.state === PrizeStatus.Evaluating && (
                <div className="evaluation-section mb-4">
                    <h3 className="text-xl font-semibold mb-2">Evaluation in Progress</h3>
                    <p>Evaluators are currently reviewing and scoring the submitted contributions.</p>
                </div>
            )}
            {prize.state === PrizeStatus.Rewarding && (
                <div className="rewarding-section mb-4">
                    <h3 className="text-xl font-semibold mb-2">Rewards Being Allocated</h3>
                    <p>The smart contract is calculating and allocating rewards based on the evaluation scores.</p>
                </div>
            )}
        </div>
    );
};

export default PrizeDetails;