import { ethers } from 'ethers';
import React, { useState } from 'react';
import { useError } from '../ErrorContext';

interface PrizeFormProps {
    initialValues?: {
        name: string;
        description: string;
        totalRewardPool: string;
        allocationStrategy: string;
        criteriaNames: string[];
    };
    onSubmit: (formData: {
        name: string;
        description: string;
        totalRewardPool: string;
        allocationStrategy: string;
        criteriaNames: string[];
    }) => Promise<void>;
    submitButtonText: string;
}

const allocationStrategies = ['LinearAllocation', 'QuadraticAllocation', 'SquareRootAllocation'];

const PrizeForm: React.FC<PrizeFormProps> = ({ initialValues, onSubmit, submitButtonText }) => {
    const { handleError } = useError();
    const [name, setName] = useState(initialValues?.name || '');
    const [description, setDescription] = useState(initialValues?.description || '');
    const [totalRewardPool, setTotalRewardPool] = useState(initialValues?.totalRewardPool || '');
    const [allocationStrategy, setAllocationStrategy] = useState(initialValues?.allocationStrategy || 'LinearAllocation');
    const [criteriaNames, setCriteriaNames] = useState<string[]>(initialValues?.criteriaNames || ['']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (!name.trim() || !description.trim() || !totalRewardPool.trim() || !allocationStrategy.trim() || criteriaNames.some(name => !name.trim())) {
                throw new Error('All fields are required');
            }

            const amount = ethers.parseEther(totalRewardPool);
            await onSubmit({
                name,
                description,
                totalRewardPool: amount.toString(),
                allocationStrategy,
                criteriaNames: criteriaNames.filter(name => name.trim())
            });
        } catch (error) {
            handleError('Error submitting prize form', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    required
                />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    required
                />
            </div>
            <div>
                <label htmlFor="totalRewardPool" className="form-label">Total Reward Pool (ETH)</label>
                <input
                    type="number"
                    id="totalRewardPool"
                    value={totalRewardPool}
                    onChange={(e) => setTotalRewardPool(e.target.value)}
                    className="form-input"
                    required
                    step="0.000000000000000001"
                    min="0"
                />
            </div>
            <div>
                <label htmlFor="allocationStrategy" className="form-label">Allocation Strategy</label>
                <select
                    id="allocationStrategy"
                    value={allocationStrategy}
                    onChange={(e) => setAllocationStrategy(e.target.value)}
                    className="form-input"
                    required
                >
                    {allocationStrategies.map((strategy) => (
                        <option key={strategy} value={strategy}>{strategy}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="form-label">Criteria Names</label>
                <div className="mt-2 space-y-2">
                    {criteriaNames.map((criteria, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={criteria}
                                onChange={(e) => {
                                    const newCriteria = [...criteriaNames];
                                    newCriteria[index] = e.target.value;
                                    setCriteriaNames(newCriteria);
                                }}
                                className="form-input"
                                placeholder={`Criteria ${index + 1}`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newCriteria = criteriaNames.filter((_, i) => i !== index);
                                    setCriteriaNames(newCriteria);
                                }}
                                className="button-danger"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setCriteriaNames([...criteriaNames, ''])}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Add Criteria
                </button>
            </div>
            <div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {submitButtonText}
                </button>
            </div>
        </form>
    );
};

export default PrizeForm;