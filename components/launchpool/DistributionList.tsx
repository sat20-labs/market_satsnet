'use client';

import { Button } from '@/components/ui/button';

const DistributionList = ({ participantsList, closeModal }: { participantsList: any[]; closeModal: () => void }) => {
  const totalAmount = participantsList.reduce(
    (total: number, participant: any) => total + parseFloat(participant.amount.split(' ')[0]),
    0
  ).toFixed(2);

  const totalTokens = participantsList.reduce(
    (total: number, participant: any) => total + parseInt(participant.allocationTokens.replace(/,/g, ''), 10),
    0
  ).toLocaleString();

  return (
    <div className="bg-zinc-900 p-6 rounded-lg shadow-md sm:w-[1360px] w-full">
      <h2 className="text-xl font-bold mb-4">参与池子列表</h2>
      <p className="text-zinc-400 mb-4">以下是参与该池子的用户及其分配详情：</p>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
          <thead className="bg-zinc-800">
            <tr>
              <th className="p-3 text-left">序号</th>
              <th className="p-3 text-left">地址</th>
              <th className="p-3 text-left">金额</th>
              <th className="p-3 text-left">分配通证</th>
              <th className="p-3 text-left">加入时间</th>
            </tr>
          </thead>
          <tbody>
            {participantsList.map((participant: any, index: number) => (
              <tr key={index} className="border-b border-gray-700">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{participant.address}</td>
                <td className="p-3">{participant.amount}</td>
                <td className="p-3">{participant.allocationTokens}</td>
                <td className="p-3">{participant.joinTime}</td>
              </tr>
            ))}
            <tr className="bg-gray-800 text-white font-bold">
              <td className="p-3">总计</td>
              <td className="p-3">{participantsList.length}</td>
              <td className="p-3">{totalAmount} BTC</td>
              <td className="p-3">{totalTokens}</td>
              <td className="p-3">-</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={closeModal}>
          关闭
        </Button>
      </div>
    </div>
  );
};

export default DistributionList;
