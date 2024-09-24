import React from "react";
import { Contribution } from "../lib/types";

interface ContributionDetailsProps {
  contribution: Contribution;
}

const ContributionDetails: React.FC<ContributionDetailsProps> = ({ contribution }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Contribution Details</h2>
      <p className="mb-2">
        <strong>Contestant:</strong> {contribution.contestant}
      </p>
      <p className="mb-4">
        <strong>Description:</strong> {contribution.description}
      </p>
    </div>
  );
};

export default ContributionDetails;