'use client';

import React from 'react';

const LiquidityProviders = () => {
  const providers = [
    { name: 'Base-LP', share: '30.00%' },
    { name: 'LP-001', share: '4.68%' },
    { name: 'LP-002', share: '4.52%' },
    { name: 'LP-003', share: '4.49%' },
    { name: 'LP-004', share: '3.46%' },
    { name: 'LP-005', share: '2.16%' },
    { name: 'LP-006', share: '2.06%' },
    { name: 'LP-007', share: '2.00%' },
    { name: 'LP-008', share: '1.46%' },
    { name: 'LP-009', share: '1.16%' },
    { name: 'LP-010', share: '0.45%' },



    // ... Add more providers as needed
  ];

  return (
    <div className="mt-6 p-4 bg-[#0E0E10] text-zinc-200 rounded-xl shadow-lg border border-zinc-700">
      <h3 className="text-base font-semibold mb-4">Liquidity Providers</h3>
      <ul className="space-y-2">
        {providers.map((provider, index) => (
          <li key={index} className="flex justify-between text-sm text-zinc-400 border-b border-zinc-800 py-1">
            <span>{index + 1}. {provider.name}</span>
            <span>{provider.share}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LiquidityProviders;
