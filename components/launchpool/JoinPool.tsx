'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';

interface JoinPoolProps {
  closeModal: () => void;
  poolData: any;
}

const JoinPool = ({ closeModal, poolData }: JoinPoolProps) => {
  const [amount, setAmount] = useState('');

  const handleConfirm = async () => {
    const params = {
      action: 'mint',
      param: amount.toString()
    }
    const result = await window.sat20.invokeContract_SatsNet(
      poolData.contractURL, JSON.stringify(params), '1')
    console.log('result:', result);
    alert(`You have successfully joined the pool with amount: ${amount}`);
    closeModal();
  };

  return (
    <div className="p-6 w-full sm:w-[480px] mx-auto bg-zinc-900 rounded-lg shadow-lg relative">
      <div className="relative flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Join Pool</h2>
        <button
          className="absolute top-0 right-0 text-zinc-400 hover:text-white"
          onClick={closeModal}
        >
          ✕
        </button>
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-zinc-300 font-semibold" htmlFor="amount">Amount to Join</label>
        <Input
          id="amount"
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="mb-2"
        />
        <div className="text-zinc-400 text-sm">Current amount: <span className="text-zinc-100 font-bold">{amount || 0}</span></div>
      </div>

      <div className="flex justify-start mt-6 gap-4">
        <Button variant="outline" className="w-full sm:w-48 h-11 text-white" onClick={handleConfirm}>
          Confirm
        </Button>
        <Button variant="outline" className="w-full sm:w-48 h-11 text-white" onClick={closeModal}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default JoinPool;
