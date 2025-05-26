'use client';

import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

const fetchParticipants = async (contractURL: string) => {
  if (!contractURL) return [];
  try {
    const result = await window.sat20.getAllAddressInContract(contractURL);
    const list = JSON.parse(result.addresses)?.data || [];
    const resultStatusList: any[] = [];
    for (const item of list) {
      const { status } = await window.sat20.getAddressStatusInContract(contractURL, item.address);
      resultStatusList.push({
        ...item,
        ...JSON.parse(status)
      });
    }
    resultStatusList.sort((a, b) => (a.address > b.address ? 1 : -1));
    return resultStatusList;
  } catch (e) {
    console.error('获取参与者失败', e);
    return [];
  }
};

const DistributionList = ({ contractURL, closeModal }: { contractURL: string; closeModal: () => void }) => {
  const { data: participantsList = [], isLoading } = useQuery({
    queryKey: ['participants', contractURL],
    queryFn: () => fetchParticipants(contractURL),
    enabled: !!contractURL,
    refetchInterval: 2000,
  });

  // 适配 amount、allocationTokens、joinTime 字段
  const adaptedList = participantsList.map((participant: any) => {
    // 计算总金额
    const mintHistory = participant.valid?.MintHistory || [];
    const totalAmt = mintHistory.reduce((sum: number, item: any) => sum + (Number(item.Amt) || 0), 0);
    // 分配通证（假设和金额一致）
    const allocationTokens = totalAmt;
    // 加入时间（取最早的 MintHistory 时间戳）
    let joinTime = '--';
    if (mintHistory.length > 0) {
      const minTime = Math.min(...mintHistory.map((item: any) => Number(item.Time) || 0).filter(Boolean));
      if (minTime && !isNaN(minTime)) {
        joinTime = new Date(minTime * 1000).toLocaleString();
      }
    }
    return {
      ...participant,
      amount: totalAmt || '--',
      allocationTokens: allocationTokens || '--',
      joinTime,
    };
  });

  const totalAmount = adaptedList.reduce(
    (total: number, participant: any) => total + (parseFloat(participant.amount) || 0),
    0
  ).toFixed(2);

  const totalTokens = adaptedList.reduce(
    (total: number, participant: any) => total + (parseInt(participant.allocationTokens.toString().replace(/,/g, ''), 10) || 0),
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
              {/* <th className="p-3 text-left">加入时间</th> */}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center p-4 text-zinc-400">加载中...</td></tr>
            ) : adaptedList.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-4 text-zinc-400">暂无参与者</td></tr>
            ) : (
              adaptedList.map((participant: any, index: number) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{participant.address}</td>
                  <td className="p-3">{participant.amount}</td>
                  <td className="p-3">{participant.allocationTokens}</td>
                  {/* <td className="p-3">{participant.joinTime}</td> */}
                </tr>
              ))
            )}
            <tr className="bg-gray-800 text-white font-bold">
              <td className="p-3">总计</td>
              <td className="p-3">{adaptedList.length}</td>
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
