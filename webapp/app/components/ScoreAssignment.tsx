import React, { useState } from 'react';
import { useError } from '../ErrorContext';
import { usePrizeManager } from '../hooks/usePrizeManager';

interface ScoreAssignmentProps {
    prizeId: number;
    onScoresAssigned: () => void;
}

const ScoreAssignment: React.FC<ScoreAssignmentProps> = ({ prizeId, onScoresAssigned }) => {
    const { assignScores } = usePrizeManager();
    const { handleError } = useError();
    const [contestants, setContestants] = useState<string[]>(['']);
    const [scores, setScores] = useState<number[][]>([[]]);

    const isValidEthereumAddress = (address: string) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    const handleAssignScores = async () => {
        try {
            const validContestants = contestants.filter(c => c.trim() !== '');
            const validScores = scores.filter(s => s.length > 0 && s.every(score => score >= 0 && score <= 100));
            if (validContestants.length !== validScores.length) {
                throw new Error('Each contestant must have at least one valid score');
            }
            if (validContestants.length === 0) {
                throw new Error('At least one contestant with scores is required');
            }
            await assignScores(prizeId, validContestants, validScores);
            setContestants(['']);
            setScores([[]]);
            onScoresAssigned();
        } catch (error) {
            handleError('Failed to assign scores', error);
        }
    };

    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Assign Scores</h3>
            {contestants.map((contestant, cIndex) => (
                <div key={cIndex} className="mb-4">
                    <input
                        type="text"
                        value={contestant}
                        onChange={(e) => {
                            const newContestants = [...contestants];
                            newContestants[cIndex] = e.target.value;
                            setContestants(newContestants);
                        }}
                        className={`contestant-input ${contestant && !isValidEthereumAddress(contestant) ? 'contestant-input-error' : ''}`}
                        placeholder="Contestant address (0x...)"
                    />
                    {contestant && !isValidEthereumAddress(contestant) && (
                        <p className="error-message">Invalid Ethereum address</p>
                    )}
                    {scores[cIndex]?.map((score, sIndex) => (
                        <input
                            key={sIndex}
                            type="number"
                            value={score}
                            onChange={(e) => {
                                const newScore = Math.min(100, Math.max(0, Number(e.target.value)));
                                const newScores = [...scores];
                                newScores[cIndex][sIndex] = newScore;
                                setScores(newScores);
                            }}
                            min="0"
                            max="100"
                            className="score-input"
                            placeholder={`Score ${sIndex + 1} (0-100)`}
                        />
                    ))}
                    <button
                        onClick={() => {
                            const newScores = [...scores];
                            newScores[cIndex] = [...(newScores[cIndex] || []), 0];
                            setScores(newScores);
                        }}
                        className="add-button mr-2"
                    >
                        Add Score
                    </button>
                </div>
            ))}
            <button
                onClick={() => {
                    setContestants([...contestants, '']);
                    setScores([...scores, []]);
                }}
                className="add-button mr-2"
            >
                Add Contestant
            </button>
            <button onClick={handleAssignScores} className="action-button">
                Submit Scores
            </button>
        </div>
    );
};

export default ScoreAssignment;