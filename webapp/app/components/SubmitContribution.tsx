import { useState } from 'react';
import { useAppContext } from '../AppContext';

interface SubmitContributionProps {
    prizeId: number;
}

export default function SubmitContribution({ prizeId }: SubmitContributionProps) {
    const [contribution, setContribution] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { prizeContract, setError } = useAppContext();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await prizeContract.submitContribution(prizeId, contribution);
            setContribution('');
            alert('Contribution submitted successfully!');
        } catch (error) {
            console.error('Failed to submit contribution:', error);
            setError('Failed to submit contribution. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4">
            <textarea
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                placeholder="Enter your contribution"
                className="w-full p-2 border rounded"
                required
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 bg-blue-500 text-white p-2 rounded disabled:opacity-50"
            >
                {isSubmitting ? 'Submitting...' : 'Submit Contribution'}
            </button>
        </form>
    );
}