import Link from 'next/link';
import React from 'react';
import { useAppContext } from '../AppContext';

const ConnectedUserActions: React.FC = () => {
    const { role } = useAppContext();

    return (
        <section className="py-16 bg-purple-500">
            <div className="container mx-auto">
                <h2 className="text-3xl font-bold text-center mb-8 text-white">Your Actions</h2>
                <div className="flex flex-col items-center space-y-4">
                    {role === 'organizer' && (
                        <Link href="/organize-prize" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full">
                            Organize a New Prize
                        </Link>
                    )}
                    <Link href="/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default ConnectedUserActions;