import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrizeDiamond } from "../hooks/usePrizeDiamond";
import { useAppContext } from "../contexts/AppContext";
import PrizeCard from "../components/PrizeCard";
import { UserRoles } from "../lib/types";
import { PrizeDetails } from "../lib/types";

const PRIZES_PER_PAGE = 9;

const isUserActiveInPrize = (userRoles: UserRoles) => {
  return userRoles.includes("ADMIN_ROLE") || userRoles.includes("EVALUATOR_ROLE");
};

const Home: React.FC = () => {
  const { getPrizes, getPrizeCount } = usePrizeDiamond();
  const { userRoles } = useAppContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPrizes, setTotalPrizes] = useState(0);

  const { data, isLoading, error } = useQuery<PrizeDetails[], Error>({
    queryKey: ["prizes", currentPage],
    queryFn: async () => {
      const startIndex = BigInt((currentPage - 1) * PRIZES_PER_PAGE);
      const count = BigInt(PRIZES_PER_PAGE);
      return getPrizes(startIndex, count);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  useEffect(() => {
    const fetchTotalPrizes = async () => {
      try {
        const count = await getPrizeCount();
        setTotalPrizes(Number(count));
      } catch (error) {
        console.error("Error fetching total prize count:", error);
      }
    };
    fetchTotalPrizes();
  }, [getPrizeCount]);

  const totalPages = Math.max(1, Math.ceil(totalPrizes / PRIZES_PER_PAGE));

  const sortedPrizes = useMemo(() => {
    const prizes = data ?? [];
    const activePrizes = prizes.filter(() => isUserActiveInPrize(userRoles));
    const inactivePrizes = prizes.filter(() => !isUserActiveInPrize(userRoles));
    return [...activePrizes, ...inactivePrizes];
  }, [data, userRoles]);

  if (error) {
    console.error("Error fetching prizes:", error);
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-lg p-8 mb-8 text-white shadow-lg">
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
      ) : error ? (
        <p className="text-center text-red-500">Error loading prizes. Please try again later.</p>
      ) : (
        <div id="prizes" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPrizes.length === 0 ? (
            <p className="text-gray-500 col-span-full">
              No prizes available at the moment. (Total count: {totalPrizes})
            </p>
          ) : (
            sortedPrizes.map((prize) => <PrizeCard key={prize.id} prize={prize} />)
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="mx-1 px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`mx-1 px-3 py-1 rounded ${
                currentPage === page ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="mx-1 px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
