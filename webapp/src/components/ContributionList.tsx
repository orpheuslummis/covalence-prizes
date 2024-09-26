import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "../contexts/AppContext";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { Contribution } from "../lib/types";

interface ContributionListProps {
  prizeId: bigint;
  refetchPrizeDetails: () => void;
}

const ContributionList: React.FC<ContributionListProps> = ({ prizeId, refetchPrizeDetails }) => {
  const { prizeDiamond } = useAppContext();
  const { address } = useAccount();

  const {
    data: contributions,
    isLoading,
    error,
  } = useQuery<Contribution[]>({
    queryKey: ["contributions", prizeId.toString()],
    queryFn: async () => {
      try {
        const count = await prizeDiamond.getContributionCount(prizeId);
        console.log(`Fetched contribution count: ${count}`);
        const contributionPromises = Array.from({ length: Number(count) }, async (_, index) => {
          const [contestant, id] = await prizeDiamond.getContributionByIndex(prizeId, BigInt(index));
          const details = await prizeDiamond.getContribution(prizeId, id);
          return {
            ...details,
            id: id ?? BigInt(index),
            contestant,
          };
        });
        const contributions = await Promise.all(contributionPromises);
        console.log('Fetched contributions:', contributions);
        return contributions;
      } catch (err) {
        console.error("Error fetching contributions:", err);
        throw err;
      }
    },
  });

  if (isLoading) return <div>Loading contributions...</div>;
  if (error) return <div>Error loading contributions: {(error as Error).message}</div>;
  if (!contributions || contributions.length === 0) return <div>No contributions found.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contributions.map((contribution, index) => {
        const { contestant, id, evaluationCount, description } = contribution;
        const contributionId = id ?? BigInt(index);

        const isOwnContribution =
          address && contestant && contestant.toLowerCase() === address.toLowerCase();

        return (
          <Link
            key={contributionId.toString()}
            to={`/prize/${prizeId}/contribution/${contributionId.toString()}`}
            className="block hover:shadow-lg transition-shadow duration-200"
          >
            <div
              className={`contribution-card ${
                isOwnContribution ? "bg-primary-50" : "bg-white"
              }`}
            >
              <div className="contribution-card-content">
                <h3 className="contribution-card-title">
                  Contribution #{index + 1}
                  {isOwnContribution && (
                    <span className="contribution-card-own-tag">
                      (Your contribution)
                    </span>
                  )}
                </h3>
                <p className="contribution-card-detail">
                  <span className="font-semibold">Contributor:</span> {contestant || "Unknown"}
                </p>
                <p className="contribution-card-detail">
                  <span className="font-semibold">Evaluation Count:</span> {evaluationCount?.toString() || "0"}
                </p>
                <p className="contribution-card-description">
                  <span className="font-semibold">Description:</span> {description || "No description provided"}
                </p>
              </div>
              <div className="contribution-card-footer">
                <span className="text-sm text-gray-500">Click to view details</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ContributionList;
