'use client';

import { Button } from '@/components/ui/button';

const JoinPool = ({ closeModal }: { closeModal: () => void }) => {
  // Mock data for demonstration
  const poolData = {
    assetName: 'OrdX005',
    poolSize: '80,000,000',
    currentWaterLevel: '48,000,000',
    progress: 60,
    participatingAddresses: 120,
  };

  const handleConfirm = () => {
    // Handle confirmation logic here
    alert('You have successfully joined the pool!');
    closeModal(); // 调用 closeModal 关闭弹窗
  };

  return (
    <div className="p-6 w-full sm:w-[1360px] mx-auto bg-zinc-900 rounded-lg shadow-lg relative">
       <div className="relative flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{`Join Pool ${poolData.assetName}`}</h2>
        <button
          className="absolute top-0 right-0 text-zinc-400 hover:text-white"
          onClick={closeModal}
        >
          ✕
        </button>
      </div>

      <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
        <thead className="p-2 bg-zinc-800 text-zinc-300">
          <tr>
            <th className="p-4 text-left w-1/3">Parameter</th>
            <th className="p-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-700">
            <td className="p-4 font-bold text-zinc-400">Asset Name</td>
            <td className="p-2">{poolData.assetName}</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="p-4 font-bold text-zinc-400">Pool Size</td>
            <td className="p-2">{poolData.poolSize}</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="p-4 font-bold text-zinc-400">Current Water Level</td>
            <td className="p-2">{poolData.currentWaterLevel}</td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="p-4 font-bold text-zinc-400">Progress</td>
            <td className="p-2">
              <div className="flex justify-start text-center w-full bg-gray-200 h-4 rounded">
                <div className="bg-purple-500 h-4 rounded" style={{ width: `${poolData.progress}%` }}>
                  <span className="ml-8 text-base text-zinc-200">{poolData.progress}%</span>
                </div>
              </div>
            </td>
          </tr>
          <tr className="border-b border-zinc-700">
            <td className="p-4 font-bold text-zinc-400">Participating Addresses</td>
            <td className="p-2">{poolData.participatingAddresses}</td>
          </tr>
        </tbody>
      </table>

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
