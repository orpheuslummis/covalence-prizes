'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import PrizeCard from '../components/PrizeCard';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { useAppContext } from './AppContext';
import { Prize, UserRoles } from './types';

const PRIZES_PER_PAGE = 9;

const isUserActiveInPrize = (prize: Prize, userRoles: UserRoles) => {
  return userRoles.includes('ADMIN_ROLE') || userRoles.includes('EVALUATOR_ROLE');
};

export default function Home() {
  const { getPrizes } = usePrizeManager();
  const { userRoles, prizeManager } = useAppContext();
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['prizes', currentPage],
    queryFn: () => getPrizes(currentPage, PRIZES_PER_PAGE),
    keepPreviousData: true,
  });

  const prizes = data?.prizes ?? [];
  const totalCount = data?.totalCount ?? 0;

  const totalPages = useMemo(() => Math.ceil(totalCount / PRIZES_PER_PAGE), [totalCount]);

  const sortedPrizes = useMemo(() =>
    [...prizes].sort((a, b) => {
      const aActive = isUserActiveInPrize(a, userRoles);
      const bActive = isUserActiveInPrize(b, userRoles);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    }),
    [prizes, userRoles]
  );

  if (error) {
    console.error('Error fetching prizes:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-lg p-8 mb-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-6">Covalence Prizes</h1>
        <p className="text-xl mb-6">
          A decentralized platform revolutionizing prize management with homomorphic smart contracts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-purple-700 bg-opacity-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Privacy & Transparency</h3>
            <p>Ensure data privacy while maintaining verifiable records.</p>
          </div>
          <div className="bg-purple-700 bg-opacity-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Flexible Rewards</h3>
            <p>Support both monetary and non-monetary incentives.</p>
          </div>
          <div className="bg-purple-700 bg-opacity-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Community-Driven</h3>
            <p>Involve stakeholders in prize creation and evaluation.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center">Loading prizes...</p>
      ) : (
        <div id="prizes" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPrizes.length === 0 ? (
            <p className="text-gray-500 col-span-full">No prizes available at the moment. (Total count: {prizeManager.prizeCount})</p>
          ) : (
            sortedPrizes.map((prize) => (
              <PrizeCard key={prize.id} prize={prize} />
            ))
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`mx-1 px-3 py-1 rounded ${currentPage === page
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}