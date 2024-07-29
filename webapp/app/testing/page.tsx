'use client';

import TestPrizeCreation from './TestPrizeCreation';

export default function TestingPage() {
    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="bg-purple-100 p-6 rounded-lg shadow-lg">
                <TestPrizeCreation />
            </div>
            {/* <div className="bg-blue-100 p-6 rounded-lg shadow-lg">
                <BatchPrizeCreation />
            </div> */}
        </div>
    );
}