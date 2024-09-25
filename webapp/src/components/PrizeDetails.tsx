import React from "react";
import { formatEther } from "viem";
import { type PrizeDetails, AllocationStrategy } from "../lib/types";

interface PrizeDetailsProps {
  prize: PrizeDetails;
}

const PrizeDetails: React.FC<PrizeDetailsProps> = ({ prize }) => {
  const detailSections = [
    {
      title: "Allocation",
      items: [
        { label: "Strategy", value: AllocationStrategy[prize.strategy] },
        { label: "Funded Amount", value: `${formatEther(prize.fundedAmount)} ETH` },
      ],
    },
    {
      title: "Contributions",
      items: [
        { label: "Total Contributions", value: prize.contributionCount.toString() },
        { label: "Evaluated Contributions", value: prize.evaluatedContributionsCount.toString() },
      ],
    },
    {
      title: "Rewards",
      items: [
        { label: "Claimed Rewards", value: prize.claimedRewardsCount.toString() },
        { label: "Rewards Allocated", value: prize.rewardsAllocated ? "Yes" : "No" },
      ],
    },
    {
      title: "Metadata",
      items: [
        { label: "Created At", value: new Date(Number(prize.createdAt) * 1000).toLocaleString() },
        { label: "Organizer", value: prize.organizer },
      ],
    },
  ];

  return (
    <div className="bg-primary-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-accent-300 mb-4">Prize Details</h2>
      <DetailSections sections={detailSections} />
    </div>
  );
};

interface DetailSectionsProps {
  sections: Array<{
    title: string;
    items: Array<{ label: string; value: string | number }>;
  }>;
}

const DetailSections: React.FC<DetailSectionsProps> = ({ sections }) => (
  <div className="space-y-6">
    {sections.map((section) => (
      <DetailSection key={section.title} title={section.title} items={section.items} />
    ))}
  </div>
);

interface DetailSectionProps {
  title: string;
  items: Array<{ label: string; value: string | number }>;
}

const DetailSection: React.FC<DetailSectionProps> = ({ title, items }) => (
  <section className="mb-6">
    <h3 className="text-xl font-semibold text-accent-400 mb-3">{title}</h3>
    <dl className="grid grid-cols-2 gap-4">
      {items.map(({ label, value }) => (
        <DetailItem key={label} label={label} value={value} />
      ))}
    </dl>
  </section>
);

interface DetailItemProps {
  label: string;
  value: string | number;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
  <div>
    <dt className="text-sm font-medium text-secondary-300">{label}</dt>
    <dd className="text-base font-semibold text-white">{value}</dd>
  </div>
);

export default PrizeDetails;
