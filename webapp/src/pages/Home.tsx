import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../contexts/AppContext";
import { UserRoles, State } from "../lib/types";
import PrizeCard from "../components/PrizeCard";

const PRIZES_PER_PAGE = 9;

const isUserActiveInPrize = (userRoles: UserRoles) => {
  return userRoles.includes("ADMIN_ROLE") || userRoles.includes("EVALUATOR_ROLE");
};

const Home: React.FC = () => {
  const { prizes, isPrizesLoading, userRoles } = useAppContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [showClosedPrizes, setShowClosedPrizes] = useState(false);

  const sortedPrizes = useMemo(() => {
    console.log("All prizes:", prizes);
    const filteredPrizes = prizes.filter((prize) =>
      showClosedPrizes ? prize.state === State.Closed : prize.state !== State.Closed
    );
    console.log("Filtered prizes:", filteredPrizes);
    const activePrizes = filteredPrizes.filter(() => isUserActiveInPrize(userRoles));
    const inactivePrizes = filteredPrizes.filter(() => !isUserActiveInPrize(userRoles));
    const sorted = [...activePrizes, ...inactivePrizes].sort((a, b) => Number(b.id) - Number(a.id));
    console.log("Sorted prizes:", sorted);
    return sorted;
  }, [prizes, userRoles, showClosedPrizes]);

  useEffect(() => {
    console.log("Rendered prizes:", sortedPrizes);
  }, [sortedPrizes]);

  const totalPages = Math.ceil(sortedPrizes.length / PRIZES_PER_PAGE);
  const startIndex = (currentPage - 1) * PRIZES_PER_PAGE;
  const endIndex = startIndex + PRIZES_PER_PAGE;
  const currentPrizes = sortedPrizes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container-default">
      <div className="gradient-background rounded-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 text-white shadow-lg">
        <p className="text-sm-mobile mb-4 sm:mb-6">
          A decentralized platform revolutionizing prize management with homomorphic smart contracts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <FeatureCard
            title="Privacy & Transparency"
            description="Ensure data privacy while maintaining verifiable records."
          />
          <FeatureCard title="Flexible Rewards" description="Support both monetary and non-monetary incentives." />
          <FeatureCard title="Community-Driven" description="Involve stakeholders in prize creation and evaluation." />
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Prizes</h2>
        <button
          onClick={() => setShowClosedPrizes(!showClosedPrizes)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {showClosedPrizes ? "Show Open Prizes" : "Show Closed Prizes"}
        </button>
      </div>

      {isPrizesLoading ? (
        <p className="text-center">Loading prizes...</p>
      ) : (
        <div id="prizes" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {currentPrizes.length === 0 ? (
            <p className="text-gray-500 col-span-full">No prizes available at the moment.</p>
          ) : (
            currentPrizes.map((prize) => <PrizeCard key={prize.id.toString()} prize={prize} />)
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
              className={`mx-1 px-3 py-1 rounded ${currentPage === page ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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

const FeatureCard: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="card bg-opacity-50 p-3 sm:p-4">
    <h3 className="text-base-mobile font-semibold mb-2">{title}</h3>
    <p className="text-xs-mobile">{description}</p>
  </div>
);

export default Home;