import React from "react";
import { Contribution } from "../lib/types";

interface ContributionSelectProps {
  contributions: Contribution[];
  selectedContributionId: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  isSubmitting: boolean;
  evaluatedContributions: bigint[];
}

const ContributionSelect: React.FC<ContributionSelectProps> = ({
  contributions,
  selectedContributionId,
  onChange,
  isSubmitting,
  evaluatedContributions,
}) => {
  return (
    <div>
      <label htmlFor="contribution" className="form-label text-xl mb-2 block">
        Select Contribution:
      </label>
      <select
        id="contribution"
        value={selectedContributionId}
        onChange={onChange}
        className="form-input w-full bg-white text-purple-800 py-3 px-4 rounded-lg"
        required
        disabled={isSubmitting}
      >
        <option value="">Select a contribution</option>
        {contributions.map((contribution) => {
          const isEvaluated = evaluatedContributions.includes(contribution.id);
          return (
            <option
              key={contribution.id.toString()}
              value={contribution.id.toString()}
              className={isEvaluated ? "text-gray-500" : ""}
            >
              Contribution {contribution.id.toString()} by {contribution.contestant}
              {isEvaluated ? " (Evaluated)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default ContributionSelect;
