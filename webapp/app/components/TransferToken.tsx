'use client';

import { ethers } from 'ethers';
import { useState } from 'react';

interface TransferTokenProps {
    tokenAddress: string;
}

const TransferToken: React.FC<TransferTokenProps> = ({ tokenAddress }) => {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsTransferring(true);

        try {
            if (typeof window.ethereum !== 'undefined') {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    ['function transfer(address to, uint256 amount) returns (bool)'],
                    signer
                );

                const transaction = await tokenContract.transfer(recipient, ethers.utils.parseUnits(amount, 18));
                await transaction.wait();
                alert('Transfer successful!');
                setRecipient('');
                setAmount('');
            }
        } catch (error) {
            console.error('Transfer failed:', error);
            alert('Transfer failed. Please try again.');
        }

        setIsTransferring(false);
    };

    return (
        <form onSubmit={handleTransfer} className="mt-4">
            <h2 className="text-xl font-semibold mb-2">Transfer Tokens</h2>
            <input
                type="text"
                placeholder="Recipient Address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full p-2 mb-2 border rounded"
                required
            />
            <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 mb-2 border rounded"
                required
            />
            <button
                type="submit"
                disabled={isTransferring}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
                {isTransferring ? 'Transferring...' : 'Transfer'}
            </button>
        </form>
    );
};

export default TransferToken;