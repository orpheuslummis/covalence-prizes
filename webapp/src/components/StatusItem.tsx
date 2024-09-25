// src/components/StatusItem.tsx
import React from "react";

interface StatusItemProps {
  label: string;
  value: string | number;
  status?: "default" | "success" | "warning" | "error";
}

const StatusItem: React.FC<StatusItemProps> = ({ label, value, status = "default" }) => {
  const statusColors: Record<string, string> = {
    default: "text-white",
    success: "text-accent-300",
    warning: "text-accent-400",
    error: "text-red-400",
  };

  return (
    <div className="flex justify-between items-center py-2 px-4 bg-primary-700 rounded-md">
      <span className="font-medium text-white">{label}: </span>
      <span className={`${statusColors[status]} truncate max-w-xs`}>{value}</span>
    </div>
  );
};

export default StatusItem;
