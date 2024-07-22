'use client';

import { useRouter } from 'next/navigation';
import { useError } from '../ErrorContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import PrizeForm from './PrizeForm';

export default function OrganizePrize() {
    const router = useRouter();
    const { createPrize } = usePrizeManager();
    const { handleError } = useError();

    const handleSubmit = async (formData: {
        name: string;
        description: string;
        totalRewardPool: string;
        allocationStrategy: string;
        criteriaNames: string[];
    }) => {
        try {
            const createdPrize = await createPrize(
                formData.name,
                formData.description,
                formData.totalRewardPool,
                formData.allocationStrategy,
                formData.criteriaNames
            );
            console.log('Prize created successfully. Initial state:', createdPrize.state);
            router.push(`/prizes/${createdPrize.id}`);
        } catch (error) {
            handleError('Error creating prize', error);
        }
    };

    return (
        <div className="bg-purple-900 min-h-screen py-12">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-purple-800 px-6 py-4">
                        <h1 className="text-3xl font-bold text-white">Organize a New Prize</h1>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-600 mb-8">
                            Covalence Prizes is a decentralized platform for creating and managing prizes
                            using homomorphic smart contracts. Prizes incentivize innovation and
                            contributions across various fields. As an organizer, you can define the prize
                            details, evaluation criteria, and allocation strategy. This form allows you to set
                            up a new prize that will be managed transparently on the blockchain.
                        </p>
                        <PrizeForm onSubmit={handleSubmit} submitButtonText="Create Prize" />
                    </div>
                </div>
            </div>
        </div>
    );
}