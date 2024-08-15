import React from 'react';

interface NetworkErrorMessageProps {
    message: string;
}

const NetworkErrorMessage: React.FC<NetworkErrorMessageProps> = ({ message }) => {
    return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Network Error: </strong>
            <span className="block sm:inline">{message}</span>
        </div>
    );
};

export default NetworkErrorMessage;