'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface JoinPoolProps {
  closeModal: () => void;
  poolData: any;
}

const JoinPool = ({ closeModal, poolData }: JoinPoolProps) => {
  const limit = Number(poolData?.limit) || 1;
  const [amount, setAmount] = useState(limit.toString());

  const infoList = [
    { label: 'Asset Name', value: poolData?.assetName },
    { label: 'Asset Protocol', value: poolData?.assetProtocol },
    { label: 'Contract Type', value: poolData?.contractType },
    { label: 'Contract URL', value: poolData?.contractURL },
    { label: 'Enable Block', value: poolData?.enableBlock },
    { label: 'Start Block', value: poolData?.startBlock },
    { label: 'Launch Ration', value: poolData?.launchRation },
    { label: 'Max Supply', value: poolData?.maxSupply },
    { label: 'Limit', value: poolData?.limit },
  ];

  const handleConfirm = async () => {
    if (Number(amount) > limit) {
      toast.error(`Amount must be less than or equal to limit (${limit})`);
      return;
    }
    const params = {
      action: 'mint',
      param: amount.toString()
    }
    const result = await window.sat20.invokeContract_SatsNet(
      poolData.contractURL, JSON.stringify(params), '1')
    console.log('result:', result);
    if (result.txId) {
      toast.success(`You have successfully joined the pool with amount: ${amount}, TxId: ${result.txId}`);
      closeModal();
    } else {
      toast.error('Join pool failed');
    }
    
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

      <div className="mb-4 grid grid-cols-1 gap-y-2 text-sm text-zinc-300">
        {infoList.map(({ label, value }) => (
          <div key={label} className="mb-1">
            <div className="font-semibold">{label}:</div>
            <div className="truncate pl-2 text-zinc-100" title={value}>{value ?? '-'}</div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-zinc-300 font-semibold" htmlFor="amount">Amount to Join</label>
        <Input
          id="amount"
          type="number"
          placeholder="Enter amount"
          value={amount}
          min={limit}
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
