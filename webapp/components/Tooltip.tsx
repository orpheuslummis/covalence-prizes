import React, { ReactNode } from 'react';

interface TooltipProps {
    content: string;
    children: ReactNode;
    disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, disabled = false }) => {
    if (disabled) {
        return <>{children}</>;
    }

    return (
        <div className="relative group">
            {children}
            <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded p-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 text-center">
                {content}
            </div>
        </div>
    );
};