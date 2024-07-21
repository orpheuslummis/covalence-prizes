import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { buttonClasses, cardClasses, inputClasses } from '../styles/common';
import { isValidAmount } from '../utils/validation';

const CreatePrize: React.FC = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { prizeContract } = useAppContext();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!name.trim() || !description.trim() || !amount.trim()) {
            setError('All fields are required');
            setIsLoading(false);
            return;
        }

        if (!isValidAmount(amount)) {
            setError('Invalid amount. Please enter a positive number with up to 18 decimal places.');
            setIsLoading(false);
            return;
        }

        if (name.length > 100) {
            setError('Prize name must be 100 characters or less');
            setIsLoading(false);
            return;
        }

        if (description.length > 1000) {
            setError('Description must be 1000 characters or less');
            setIsLoading(false);
            return;
        }

        try {
            await prizeContract.createPrize(name, description, amount);
            setName('');
            setDescription('');
            setAmount('');
            // TODO: Add success message or redirect
        } catch (err) {
            console.error('Failed to create prize:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`${cardClasses} space-y-4`}>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="prizeName" className="block text-sm font-medium text-gray-700 mb-1">Prize Name</label>
                    <input
                        type="text"
                        id="prizeName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="prizeAmount" className="block text-sm font-medium text-gray-700 mb-1">Prize Amount</label>
                    <input
                        type="number"
                        id="prizeAmount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
            </div>
            <div>
                <label htmlFor="prizeDescription" className="block text-sm font-medium text-gray-700 mb-1">Prize Description</label>
                <textarea
                    id="prizeDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={inputClasses}
                    required
                ></textarea>
            </div>
            {error && (
                <div className="text-red-600 text-sm">{error}</div>
            )}
            <div className="text-right">
                <button
                    type="submit"
                    disabled={isLoading}
                    className={isLoading ? buttonClasses.disabled : buttonClasses.primary}
                >
                    {isLoading ? 'Creating...' : 'Create Prize'}
                </button>
            </div>
        </form>
    );
};

export default CreatePrize;