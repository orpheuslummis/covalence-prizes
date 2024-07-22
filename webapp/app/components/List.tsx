import React from 'react';

interface ListProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    emptyMessage?: string;
}

function List<T>({ items, renderItem, emptyMessage = "No items available." }: ListProps<T>) {
    if (items.length === 0) {
        return <div>{emptyMessage}</div>;
    }

    return (
        <div>
            {items.map((item, index) => (
                <div key={index} className="mb-4">
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}

export default List;