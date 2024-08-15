'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../app/AppContext';
import { useError } from '../app/ErrorContext';
import { usePrizeDiamond } from '../hooks/usePrizeDiamond';
import { State } from '../types';

const PrizeManagement: React.FC = () => {
    const { role } = useAppContext();
    const {
        addEvaluators,
        assignCriteriaWeights,
        fundTotally,
        moveToNextState,
        assignScoresForContestant,
        allocateRewardsBatch,
        getState,
        getPrizes
    } = usePrizeDiamond();
    const { handleError } = useError();
    const [selectedPrizeId, setSelectedPrizeId] = useState<bigint | null>(null);
    const [currentState, setCurrentState] = useState<State | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [evaluators, setEvaluators] = useState<string[]>(['']);
    const [weights, setWeights] = useState<number[]>([]);
    const [fundAmount, setFundAmount] = useState('');
    const [contestants, setContestants] = useState<string[]>(['']);
    const [scores, setScores] = useState<number[][]>([[]]);
    const [loading, setLoading] = useState(false);

    const updatePrizeState = useCallback(async () => {
        if (selectedPrizeId !== null) {
            try {
                const state = await getState(selectedPrizeId);
                setCurrentState(state);
            } catch (error) {
                handleError('Failed to update prize state', error);
            }
        }
    }, [selectedPrizeId, getState, handleError]);

    const handlePrizeSelection = (prizeId: bigint) => {
        try {
            setSelectedPrizeId(prizeId);
            updatePrizeState();
        } catch (error) {
            handleError('Failed to select prize', error);
        }
    };

    useEffect(() => {
        if (selectedPrizeId !== null) {
            updatePrizeState();
        }
    }, [selectedPrizeId, updatePrizeState]);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const handleAction = async (action: () => Promise<any>, successMessage: string) => {
        setLoading(true);
        try {
            await action();
            setFeedback({ type: 'success', message: successMessage });
            await updatePrizeState();
        } catch (error) {
            handleError('Action failed', error);
            setFeedback({ type: 'error', message: 'Action failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddEvaluators = () =>
        handleAction(() => addEvaluators(selectedPrizeId!, evaluators.filter(e => e)), 'Evaluators added successfully');

    const handleAssignWeights = () =>
        handleAction(() => assignCriteriaWeights(selectedPrizeId!, weights), 'Weights assigned successfully');

    const handleFundPrize = () =>
        handleAction(async () => {
            await fundTotally(selectedPrizeId!, fundAmount);
        }, 'Prize funded successfully');

    const handleMoveToNextState = () =>
        handleAction(async () => {
            await moveToNextState(selectedPrizeId!);
        }, 'Moved to next state successfully');

    const handleAssignScores = () =>
        handleAction(() => assignScoresForContestant(selectedPrizeId!, contestants.filter(c => c), scores), 'Scores assigned successfully');

    const handleAllocateRewards = () =>
        handleAction(() => allocateRewardsBatch(selectedPrizeId!), 'Rewards allocated successfully');

    if (!web3.isConnected) {
        return <div className="text-center p-4 bg-yellow-100 text-yellow-700 rounded">Please connect your wallet to manage prizes.</div>;
    }

    if (role !== 'organizer') {
        return <div className="text-center p-4 bg-red-100 text-red-700 rounded">You do not have permission to manage prizes.</div>;
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto p-4">
            {feedback && (
                <div className={feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}>
                    {feedback.message}
                </div>
            )}
            {(loading || prizeManagerLoading) && <div className="loading-indicator">Loading...</div>}
            <select
                value={selectedPrizeId || ''}
                onChange={(e) => handlePrizeSelection(Number(e.target.value))}
                className="select-field"
            >
                <option value="">Select a prize</option>
                {prizes.map((prize) => (
                    <option key={prize.id} value={prize.id}>{prize.name}</option>
                ))}
            </select>
            {currentState && <div className="text-lg font-semibold mt-4">Current State: {currentState}</div>}

            {currentState === PrizeStatus.Setup && (
                <div className="form-section">
                    <div>
                        <h3 className="form-title">Add Evaluators</h3>
                        {evaluators.map((evaluator, index) => (
                            <input
                                key={index}
                                type="text"
                                value={evaluator}
                                onChange={(e) => {
                                    const newEvaluators = [...evaluators];
                                    newEvaluators[index] = e.target.value;
                                    setEvaluators(newEvaluators);
                                }}
                                className="input-field"
                                placeholder="Evaluator address"
                            />
                        ))}
                        <button onClick={() => setEvaluators([...evaluators, ''])} className="button-secondary">Add Evaluator</button>
                        <button onClick={handleAddEvaluators} disabled={loading} className="submit-button ml-2">Submit Evaluators</button>
                    </div>
                    <div>
                        <h3 className="form-title">Assign Weights</h3>
                        {weights.map((weight, index) => (
                            <input
                                key={index}
                                type="number"
                                value={weight}
                                onChange={(e) => {
                                    const newWeights = [...weights];
                                    newWeights[index] = Number(e.target.value);
                                    setWeights(newWeights);
                                }}
                                className="weight-input"
                                placeholder="Weight"
                                min="0"
                                max="100"
                            />
                        ))}
                        <button onClick={() => setWeights([...weights, 0])} className="add-button">Add Weight</button>
                        <button onClick={handleAssignWeights} disabled={loading} className="submit-button ml-2">Submit Weights</button>
                    </div>
                    <div>
                        <h3 className="form-title">Fund Prize</h3>
                        <input
                            type="text"
                            value={fundAmount}
                            onChange={(e) => setFundAmount(e.target.value)}
                            className="input-field"
                            placeholder="Amount in ETH"
                        />
                        <button onClick={handleFundPrize} disabled={loading} className="submit-button">Fund Prize</button>
                    </div>
                </div>
            )}

            {currentState === PrizeStatus.Evaluating && (
                <div className="form-section">
                    <h3 className="form-title">Assign Scores</h3>
                    {contestants.map((contestant, cIndex) => (
                        <div key={cIndex} className="space-y-2">
                            <input
                                type="text"
                                value={contestant}
                                onChange={(e) => {
                                    const newContestants = [...contestants];
                                    newContestants[cIndex] = e.target.value;
                                    setContestants(newContestants);
                                }}
                                className="contestant-input"
                                placeholder="Contestant address"
                            />
                            {scores[cIndex]?.map((score, sIndex) => (
                                <input
                                    key={sIndex}
                                    type="number"
                                    value={score}
                                    onChange={(e) => {
                                        const newScores = [...scores];
                                        newScores[cIndex][sIndex] = Number(e.target.value);
                                        setScores(newScores);
                                    }}
                                    className="score-input"
                                    placeholder={`Score ${sIndex + 1}`}
                                    min="0"
                                    max="100"
                                />
                            ))}
                            <button onClick={() => {
                                const newScores = [...scores];
                                newScores[cIndex] = [...(newScores[cIndex] || []), 0];
                                setScores(newScores);
                            }} className="add-button">Add Score</button>
                        </div>
                    ))}
                    <button onClick={() => {
                        setContestants([...contestants, '']);
                        setScores([...scores, []]);
                    }} className="add-button">Add Contestant</button>
                    <button onClick={handleAssignScores} disabled={loading} className="submit-button ml-2">Submit Scores</button>
                </div>
            )}

            {currentState === PrizeStatus.Rewarding && (
                <button onClick={handleAllocateRewards} disabled={loading} className="action-button">Allocate Rewards</button>
            )}

            {currentState !== PrizeStatus.Closed && (
                <button onClick={handleMoveToNextState} disabled={loading} className="action-button">Move to Next State</button>
            )}
        </div>
    );
};

export default PrizeManagement;