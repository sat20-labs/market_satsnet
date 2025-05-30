'use client';

import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

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
    const totalValue = mintHistory.reduce((sum: number, item: any) => sum + (Number(item.Value) || 0), 0);
    return {
      ...participant,
      amount: totalAmt,
      value: totalValue
    };
  });
  console.log('adaptedList', adaptedList);
  
  const totalAmount = adaptedList.reduce(
    (total: number, participant: any) => total + (parseFloat(participant.amount) || 0),
    0
  ).toFixed(0);
  const totalValue = adaptedList.reduce(
    (total: number, participant: any) => total + (parseFloat(participant.value) || 0),
    0
  ).toFixed(0);

  const totalTokens = adaptedList.reduce(
    (total: number, participant: any) => total + (parseInt(participant.amount.toString().replace(/,/g, ''), 10) || 0),
    0
  ).toLocaleString();

  return (
    <div className="w-[400px] sm:w-[1280px]  bg-zinc-900 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">参与池子列表</h2>
      
      <p className="text-zinc-400 mb-4">以下是参与该池子的用户及其分配详情：</p>
      <button className="absolute top-8 right-8 text-zinc-400 hover:text-white" onClick={closeModal}>
            ✕
       </button>
      <div className="max-h-[600px] overflow-y-auto w-full">
        <div className="relative overflow-x-auto"> {/* Ensure horizontal scrolling */}
          <Table className="table-fix mx-auto mb-4 border-collapse border border-gray-700 rounded-lg shadow-md">
            <TableHeader className="bg-zinc-800">
              <TableRow>
                <TableHead className="p-3 text-left">序号</TableHead>
                <TableHead className="p-3 text-left">地址</TableHead>
                <TableHead className="p-3 text-left">资产数量/聪</TableHead>               
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center p-4 text-zinc-400">加载中...</TableCell></TableRow>
              ) : adaptedList.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center p-4 text-zinc-400">暂无参与者</TableCell></TableRow>
              ) : (
                adaptedList.map((participant: any, index: number) => (
                  <TableRow key={index} className="border-b border-gray-700">
                    <TableCell className="p-3">{index + 1}</TableCell>
                    <TableCell className="p-3">{participant.address}</TableCell>
                    <TableCell className="p-3">{participant.amount}/{participant.value}</TableCell>
                    
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
     
      <div className="flex justify-between mt-4 font-bold">
        <p className="text-zinc-400">Total: {adaptedList.length}</p>
        <p className="text-zinc-400 mr-6">Total Amount: {totalAmount} / {totalValue}</p>
      </div>
      <div className="flex justify-end mt-4">
        <Button variant="outline" className='w-48 h-11 mb-2 mx-4 text-base text-zinc-300' onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default DistributionList;
