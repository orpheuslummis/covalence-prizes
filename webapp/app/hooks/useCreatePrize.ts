import { useState } from 'react';
import { usePrizeContract } from './usePrizeContract';

export const useCreatePrize = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { createNewPrize } = usePrizeContract();

    const createPrize = async (name: string, description: string, amount: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await createNewPrize(name, description, amount);
        } catch (err) {
            console.error('Failed to create prize:', err);
            setError(err instanceof Error ? err.message : 'Failed to create prize. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return { createPrize, isLoading, error };
};