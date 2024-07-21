'use client';

import React, { useState } from 'react';
import PrizeDetails from './PrizeDetails';

const PrizeList: React.FC<{ prizes: Prize[] }> = ({ prizes }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const prizesPerPage = 5;

    const indexOfLastPrize = currentPage * prizesPerPage;
    const indexOfFirstPrize = indexOfLastPrize - prizesPerPage;
    const currentPrizes = prizes.slice(indexOfFirstPrize, indexOfLastPrize);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    if (prizes.length === 0) {
        return (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">No prizes available at the moment.</span>
            </div>
        );
    }

    return (
        <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Available Prizes</h2>
            <ul className="space-y-4">
                {currentPrizes.map((prize) => (
                    <li key={prize.id} className="bg-white shadow rounded-lg p-4">
                        <PrizeDetails prize={prize} />
                    </li>
                ))}
            </ul>
            <div className="mt-4 flex justify-center">
                {Array.from({ length: Math.ceil(prizes.length / prizesPerPage) }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => paginate(i + 1)}
                        className={`mx-1 px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
        </section>
    );
};

export default PrizeList;