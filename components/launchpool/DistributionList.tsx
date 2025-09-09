'use client';

import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/api';
import ParticipantsTable from './ParticipantsTable';

const fetchParticipants = async (contractURL: string) => {
  if (!contractURL) return [];
  try {
    const response = await marketApi.getContractAllAddresses(contractURL);
    console.log('response', response);
    const resultStatusList = JSON.parse(response.status)?.data || [];
    // for (const item of list) {
    //   const { status } = await window.sat20.getAddressStatusInContract(contractURL, item.address);
    //   resultStatusList.push({
    //     ...item,
    //     ...JSON.parse(status)
    //   });
    // }
    // resultStatusList.sort((a, b) => (a.address > b.address ? 1 : -1));
    return resultStatusList;
  } catch (e) {
    console.error('获取参与者失败', e);
    return [];
  }
};

const DistributionList = ({ contractURL, closeModal, bindingSat }: { contractURL: string; closeModal: () => void, bindingSat: number }) => {
  // const { data: participantsList = [], isLoading } = useQuery({
  //   queryKey: ['participants', contractURL],
  //   queryFn: () => fetchParticipants(contractURL),
  //   enabled: !!contractURL,
  //   refetchInterval: 2000,
  // });
  // console.log('participantsList', participantsList);
  // // 适配 amount、allocationTokens、joinTime 字段
  // const adaptedList = participantsList.map((participant: any) => {
  //   // 计算总金额
  //   const TotalMint = participant.valid?.TotalMint || [];
  //   return {
  //     ...participant,
  //     amount: TotalMint + bindingSat - 1,
  //     bindingSat: bindingSat
  //   };
  // });
  
  // const totalAmount = adaptedList.reduce(
  //   (total: number, participant: any) => total + (parseFloat(participant.amount) || 0),
  //   0
  // ).toFixed(0);
  // const totalValue = adaptedList.reduce(
  //   (total: number, participant: any) => total + (parseFloat(participant.bindingSat) || 0),
  //   0
  // ).toFixed(0);

  // const totalTokens = adaptedList.reduce(
  //   (total: number, participant: any) => total + (parseInt(participant.amount.toString().replace(/,/g, ''), 10) || 0),
  //   0
  // ).toLocaleString();

  return (
    <div className="w-[400px] sm:w-[1280px] max-w-10/12 mx-auto bg-zinc-900 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">参与池子列表</h2>
      
      <p className="text-zinc-400 mb-4">以下是参与该池子的用户及其分配详情：</p>
      <button className="absolute top-8 right-8 text-zinc-400 hover:text-white" onClick={closeModal}>
            ✕
       </button>
      <div className="max-h-[600px] overflow-y-auto w-full">
        <div className="relative overflow-x-auto"> {/* Ensure horizontal scrolling */}
          <ParticipantsTable
            contractURL={contractURL}
            bindingSat={bindingSat}
            showMintHistory={true}
            showIndex={true}
            tableHeaders={['地址', '资产数量/聪', '退款聪数']}
          />
        </div>
      </div>
     
      {/* <div className="flex justify-between mt-4 font-bold">
        <p className="text-zinc-400">Total: {adaptedList.length}</p>
        <p className="text-zinc-400 mr-6">Total Amount: {totalAmount} / {totalValue}</p>
      </div> */}
      <div className="flex justify-end mt-4">
        <Button variant="outline" className='w-48 h-11 mb-2 mx-4 text-base text-zinc-300' onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default DistributionList;
