import Link from 'next/link';
import React from 'react';
import { Prize } from '../app/types';

interface ListProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    emptyMessage?: string;
    showActions?: boolean;
    onItemSelect?: (item: T) => void;
    renderClaimReward?: (itemId: number) => React.ReactNode;
}

const List: React.FC<ListProps<Prize>> = ({
    items,
    renderItem,
    emptyMessage = "No items to display",
    showActions = false,
    onItemSelect,
    renderClaimReward
}) => {
    if (!Array.isArray(items) || items.length === 0) {
        return <div>{emptyMessage}</div>;
    }

    const renderPrize = (prize: Prize) => (
        <>
            {renderItem(prize)}
            {showActions && (
                <div className="mt-2">
                    {prize.active && onItemSelect && (
                        <button
                            onClick={() => onItemSelect(prize)}
                            className="mr-2 px-2 py-1 bg-blue-500 text-white rounded"
                        >
                            Submit Contribution
                        </button>
                    )}
                    {!prize.active && !prize.claimed && renderClaimReward && renderClaimReward(prize.id)}
                    {prize.claimed && <span className="text-gray-500">Reward Claimed</span>}
                </div>
            )}
            <Link href={`/prizes/${prize.id}`} className="block mt-2 text-blue-500">View Details</Link>
        </>
    );

    return (
        <ul>
            {items.map((item, index) => (
                <li key={index}>{renderPrize(item)}</li>
            ))}
        </ul>
    );
};

export default List;