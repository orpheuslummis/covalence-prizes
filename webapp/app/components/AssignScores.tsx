import { useState } from 'react';
import { usePrizeContract } from '../hooks/usePrizeContract';

interface Contribution {
    id: number;
    content: string;
}

interface AssignScoresProps {
    prizeId: number;
    contributions: Contribution[];
}

export default function AssignScores({ prizeId, contributions }: AssignScoresProps) {
    const [scores, setScores] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { assignScores } = usePrizeContract();

    const handleScoreChange = (contributionId: number, score: number) => {
        setScores({ ...scores, [contributionId]: score });
    };

    const handleSubmitScores = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const contributionIds = Object.keys(scores).map(Number);
            const scoreValues = Object.values(scores);
            await assignScores(prizeId, contributionIds, scoreValues);
            alert('Scores assigned successfully!');
        } catch (error) {
            console.error('Failed to assign scores:', error);
            setError('Failed to assign scores. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            {contributions.map((contribution) => (
                <div key={contribution.id}>
                    <p>{contribution.content}</p>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={scores[contribution.id] || ''}
                        onChange={(e) => handleScoreChange(contribution.id, parseInt(e.target.value))}
                        disabled={isSubmitting}
                    />
                </div>
            ))}
            {error && <p className="text-red-500">{error}</p>}
            <button onClick={handleSubmitScores} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Scores'}
            </button>
        </div>
    );
}