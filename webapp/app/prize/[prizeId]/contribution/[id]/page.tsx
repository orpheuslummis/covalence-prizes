'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Contribution } from '../../../../../types';
import { useAppContext } from '../../../../AppContext';

export default function ContributionPage() {
    const { prizeId, id } = useParams();
    const router = useRouter();
    const { prizeDiamond, isLoading } = useAppContext();
    const [contribution, setContribution] = useState<Contribution | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContribution = async () => {
            if (!prizeId || !id) {
                setError('Invalid prize or contribution ID');
                return;
            }

            try {
                const contributionData = await prizeDiamond.getContribution(BigInt(prizeId as string), BigInt(id as string));
                setContribution(contributionData);
            } catch (err) {
                console.error('Error fetching contribution:', err);
                setError('Failed to fetch contribution details');
            }
        };

        fetchContribution();
    }, [prizeId, id, prizeDiamond]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen text-white text-xl">Loading contribution data...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500 text-xl">{error}</div>;
    }

    if (!contribution) {
        return <div className="flex justify-center items-center h-screen text-white text-xl">Contribution not found</div>;
    }

    return (
        <div className="min-h-screen bg-purple-900 text-white p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center">Contribution Details</h1>
                <div className="bg-white text-purple-900 rounded-lg shadow-lg p-6 mb-8">
                    <p className="mb-4 text-lg"><strong>Contestant:</strong> {contribution.contestant}</p>
                    <p className="mb-4 text-lg"><strong>Description:</strong></p>
                    <div className="bg-purple-100 p-4 rounded-md whitespace-pre-wrap text-purple-900">
                        {contribution.description}
                    </div>
                </div>
                <button
                    onClick={() => router.push(`/prize/${prizeId}`)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                >
                    Back to Prize
                </button>
            </div>
        </div>
    );
}