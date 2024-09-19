import React from "react";
import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { shortenAddress } from "../lib/lib";
import { PrizeDetails, State } from "../lib/types";

interface PrizeCardProps {
  prize: PrizeDetails;
}

const PrizeCard: React.FC<PrizeCardProps> = React.memo(({ prize }) => {
  const statusColors: Record<State, string> = {
    [State.Setup]: "bg-yellow-300 text-yellow-800",
    [State.Open]: "bg-green-300 text-green-800",
    [State.Evaluating]: "bg-indigo-300 text-indigo-800",
    [State.Allocating]: "bg-red-300 text-red-800",
    [State.Claiming]: "bg-pink-300 text-pink-800",
    [State.Closed]: "bg-gray-300 text-gray-800",
  };

  const generateGradient = (prizeData: PrizeDetails) => {
    const hash = prizeData.id.toString() || prizeData.name;
    const seed = hash.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

    const hue1 = seed % 360;
    const hue2 = (hue1 + 40) % 360;
    const saturation = 80 + (seed % 20);
    const lightness1 = 25 + (seed % 20);
    const lightness2 = lightness1 + 10;

    return `linear-gradient(135deg, 
                hsl(${hue1}, ${saturation}%, ${lightness1}%), 
                hsl(${hue2}, ${saturation}%, ${lightness2}%))`;
  };

  const gradientStyle = {
    background: generateGradient(prize),
  };

  const formattedReward =
    prize.monetaryRewardPool && prize.fundedAmount ? parseFloat(formatEther(prize.monetaryRewardPool)) : 0;
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

  return (
    <Link to={`/prize/${prize.id}`} className="prize-card">
      <div className="prize-card-header" style={gradientStyle}>
        <div className="prize-card-header-content">
          <h2 className="prize-card-title">{prize.name}</h2>
          <p className="prize-card-description">{prize.description}</p>
        </div>
        <div className="prize-card-header-overlay"></div>
      </div>

      <div className="prize-card-body">
        <div className="prize-card-details">
          <div className="prize-card-detail-item">
            <p className="prize-card-detail-label">Organizer</p>
            <p className="prize-card-detail-value">
              {prize.organizer ? shortenAddress(prize.organizer) : "Not specified"}
            </p>
          </div>
          <div className="prize-card-detail-item">
            <p className="prize-card-detail-label">Strategy</p>
            <p className="prize-card-detail-value">{prize.strategy}</p>
          </div>
        </div>

        <div className="prize-card-criteria">
          <p className="prize-card-detail-label">Criteria</p>
          <p className="prize-card-detail-value">{formatCriteria(prize.criteriaNames)}</p>
        </div>

        <div className="prize-card-reward">
          <p className="prize-card-detail-label">Reward Pool</p>
          <p className="prize-card-reward-value">{formattedReward.toFixed(6)} ETH</p>
        </div>

        <div className="prize-card-footer">
          <div className="prize-card-created">
            <p className="prize-card-detail-label">Created</p>
            <p className="prize-card-detail-value">{formattedCreatedDate}</p>
          </div>
          <div className={`prize-card-status ${statusColors[prize.state]}`}>{State[prize.state]}</div>
        </div>
      </div>
    </Link>
  );
});

PrizeCard.displayName = "PrizeCard";

export default PrizeCard;
