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
    success: "text-green-400",
    warning: "text-yellow-400",
    error: "text-red-400",
  };

  return (
    <div className="flex justify-between items-center py-2 px-4 bg-purple-700 rounded-md">
      <span className="font-medium">{label}: </span>
      <span className={`${statusColors[status]} truncate max-w-xs`}>{value}</span>
    </div>
  );
};

export default StatusItem;
