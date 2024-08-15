import { useState } from 'react';
import { usePrizeManager } from '../hooks/usePrizeManager';

interface SubmitContributionProps {
    prizeId: number;
}

const SubmitContribution: React.FC<SubmitContributionProps> = ({ prizeId }) => {
    const { submitContribution } = usePrizeManager();
    const [contribution, setContribution] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submitContribution(prizeId, contribution);
            setContribution('');
            alert('Contribution submitted successfully!');
        } catch (error) {
            console.error('Error submitting contribution:', error);
            alert('Error submitting contribution. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <textarea
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                placeholder="Your Contribution"
                required
            />
            <button type="submit">Submit Contribution</button>
        </form>
    );
};

export default SubmitContribution;