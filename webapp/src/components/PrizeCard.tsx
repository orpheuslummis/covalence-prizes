// src/components/PrizeCard.tsx

import React from "react";
import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { shortenAddress } from "../lib/lib";
import { PrizeDetails, State, AllocationStrategy } from "../lib/types";
import FractalPatternBackground from "./FractalPatternBackground";

interface PrizeCardProps {
  prize: PrizeDetails;
}

const PrizeCard: React.FC<PrizeCardProps> = React.memo(({ prize }) => {
  const statusColors: Record<State, string> = {
    [State.Setup]: "bg-accent-300 text-accent-800",
    [State.Open]: "bg-primary-300 text-primary-800",
    [State.Evaluating]: "bg-secondary-300 text-secondary-800",
    [State.Allocating]: "bg-accent-300 text-accent-800",
    [State.Claiming]: "bg-primary-300 text-primary-800",
    [State.Closed]: "bg-neutral-300 text-neutral-800",
  };

  const formattedReward =
    prize.monetaryRewardPool && prize.fundedAmount
      ? parseFloat(formatEther(prize.monetaryRewardPool))
      : 0;
  const formattedCreatedDate = prize.createdAt
    ? new Date(Number(prize.createdAt) * 1000).toISOString().split("T")[0]
    : "N/A";

  const formatCriteria = (criteria: string[]) => {
    const maxLength = 69;
    let result = criteria.join(", ");
    if (result.length > maxLength) {
      result = result.substring(0, maxLength) + "...";
    }
    return result;
  };

  const truncateDescription = (description: string, maxLength: number = 100) => {
    if (description.length <= maxLength) return description;
    return description.slice(0, maxLength) + '...';
  };

  return (
    <Link
      to={`/prize/${prize.id}`}
      className="group rounded-lg overflow-hidden shadow-lg h-full flex flex-col bg-white"
    >
      <div className="relative h-48">
        <FractalPatternBackground prize={prize} />
        <div className="absolute inset-0 bg-black/50"></div> {/* Improved overlay */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-center px-4 text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-shadow-md">{prize.name}</h2>
          <p className="text-sm sm:text-base mt-2 line-clamp-2">{truncateDescription(prize.description)}</p>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-between p-6">
        <div>
          <div className="space-y-2"> {/* Added spacing */}
            <div>
              <p className="text-neutral-600">Organizer</p>
              <p className="font-medium">
                {prize.organizer ? shortenAddress(prize.organizer) : "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-neutral-600">Strategy</p>
              <p className="font-medium">{AllocationStrategy[prize.strategy]}</p>
            </div>
          </div>

          <div className="mt-4"> {/* Added margin */}
            <p className="text-neutral-600">Criteria</p>
            <p className="font-medium">{formatCriteria(prize.criteriaNames)}</p>
          </div>

          <div className="mt-4"> {/* Added margin */}
            <p className="text-neutral-600">Reward Pool</p>
            <p className="text-xl font-bold text-accent-500">{formattedReward.toFixed(6)} ETH</p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4"> {/* Added margin and flex */}
          <div>
            <p className="text-neutral-600">Created</p>
            <p className="font-medium">{formattedCreatedDate}</p>
          </div>
          <div className={`px-2 py-1 rounded-md ${statusColors[prize.state]}`}>
            {State[prize.state]}
          </div>
        </div>
      </div>
    </Link>
  );
});

PrizeCard.displayName = "PrizeCard";

export default PrizeCard;
