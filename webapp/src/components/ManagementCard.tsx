// src/components/ManagementCard.tsx
import React from "react";

interface ManagementCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ManagementCard: React.FC<ManagementCardProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`bg-purple-800 rounded-lg p-6 shadow-lg ${className}`}>
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
};

export default ManagementCard;
