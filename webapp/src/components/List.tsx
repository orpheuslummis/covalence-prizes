import React from "react";

interface ListProps<T extends object> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: React.ReactNode;
  showActions?: boolean;
  onItemSelect?: (item: T) => void;
  renderClaimReward?: (itemId: string | number) => React.ReactNode;
}

function List<T extends object>({
  items,
  renderItem,
  emptyMessage = "No items to display",
  showActions = false,
  onItemSelect,
  renderClaimReward,
}: ListProps<T>) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div>{emptyMessage}</div>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          {renderItem(item)}
          {showActions && onItemSelect && (
            <div className="mt-2">
              <button onClick={() => onItemSelect(item)} className="mr-2 px-2 py-1 bg-blue-500 text-white rounded">
                Select Item
              </button>
            </div>
          )}
          {showActions && renderClaimReward && "id" in item && renderClaimReward(item.id as string | number)}
        </li>
      ))}
    </ul>
  );
}

export default List;
