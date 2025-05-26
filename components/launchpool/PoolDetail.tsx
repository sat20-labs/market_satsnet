'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { PoolStatus, statusTextMap, statusColorMap } from '@/types/launchpool';
import JoinPool from './JoinPool';
import { Modal } from '@/components/ui/modal';
import { useQuery } from '@tanstack/react-query';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';
import { hideStr } from '@/utils';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { WalletConnectBus } from '../wallet/WalletConnectBus';
import { useCommonStore } from '@/store/common';
const LaunchPoolDetails = ({ closeModal, poolDetails }: { closeModal: () => void; poolDetails: any }) => {
  const { satsnetHeight } = useCommonStore();
  const { address } = useReactWalletStore();
  const canViewParticipants = () => {
    return [
      PoolStatus.ACTIVE,
      PoolStatus.FULL,
      PoolStatus.DISTRIBUTING,
      PoolStatus.COMPLETED,
      PoolStatus.CLOSED,
      PoolStatus.EXPIRED,
      PoolStatus.EXPIRED_UNFILLED,
    ].includes(poolDetails.poolStatus);
  };

  const [activeTab, setActiveTabState] = React.useState<string>("basic");
  const [showJoinModal, setShowJoinModal] = React.useState(false);

  function setActiveTab(tab: string): void {
    setActiveTabState(tab);
  }

  // 获取参与者的异步函数
  const fetchParticipants = async () => {
    if (!poolDetails?.contractURL) return [];
    try {
      const result = await window.sat20.getAllAddressInContract(poolDetails.contractURL);
      const list = JSON.parse(result.addresses)?.data || [];
      console.log('list', list);

      const resultStatusList: any[] = [];
      for (const item of list) {
        const { status } = await window.sat20.getAddressStatusInContract(poolDetails.contractURL, item.address);
        resultStatusList.push({
          ...item,
          ...JSON.parse(status)
        });
      }
      // 按 address 升序排序
      resultStatusList.sort((a, b) => (a.address > b.address ? 1 : -1));
      console.log('resultStatusList', resultStatusList);
      return resultStatusList;
    } catch (e) {
      console.error('获取参与者失败', e);
      return [];
    }
  };

  // 使用useQuery调用fetchParticipants
  const { data: participantsData = [], isLoading: isParticipantsLoading } = useQuery({
    queryKey: ['participants', poolDetails?.contractURL],
    queryFn: fetchParticipants,
    enabled: canViewParticipants() && !!poolDetails?.contractURL,
    refetchInterval: 2000,
  });
  console.log('participantsData', participantsData);

  const onchainStatusTextMap = {
    '-2': 'EXPIRED（已过期）',
    '-1': 'CLOSED（已关闭）',
    '0': 'INIT（初始化）',
    '100': 'READY（正常工作阶段）',
    '200': 'CLOSING（关闭中）',
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="p-6 bg-zinc-900 rounded-lg shadow-lg relative w-full max-w-[1360px] mx-auto overflow-hidden">
        <div className="relative flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{poolDetails.assetName} Details</h2>
          <button className="absolute top-0 right-0 text-zinc-400 hover:text-white" onClick={closeModal}>
            ✕
          </button>
        </div>

        <Tabs defaultValue="basic">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="template">Contract Template</TabsTrigger>
            {canViewParticipants() && <TabsTrigger value="participants">Participants</TabsTrigger>}
          </TabsList>

          <div className="h-[680px] overflow-y-auto">
            <TabsContent value="basic">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Pool Status</h3>
                  <Badge className={`${statusColorMap[poolDetails.poolDetails]} text-white`}>
                    {statusTextMap[poolDetails.poolStatus]}
                  </Badge>
                </div>
                <p className="text-zinc-400 mb-4">{poolDetails.description}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
                {/* 聪网高度静态提示 */}
                <div className="text-zinc-400 text-sm mt-2">
                  当前聪网高度：{satsnetHeight}
                </div>

                <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                  <tbody>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 w-1/3">Status</td>
                      <td className="p-2">
                        <Badge className={`${statusColorMap[poolDetails.poolStatus]} text-white`}>
                          {statusTextMap[poolDetails.poolStatus]}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Total Supply</td>
                      <td className="p-2">{poolDetails.totalSupply}</td>
                    </tr>
                    {/* <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Pool Size</td>
                      <td className="p-2">{poolDetails.poolSize}</td>
                    </tr> */}
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Launch Cap</td>
                      <td className="p-2">{poolDetails.launchCap}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Progress</td>
                      <td className="p-2">
                        <div className="w-full bg-gray-200 h-2 rounded">
                          <div
                            className="bg-purple-500 h-2 rounded"
                            style={{ width: `${poolDetails.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-zinc-400 mt-1">{poolDetails.progress}%</span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Protocol</td>
                      <td className="p-2">{poolDetails.protocol}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Start Block</td>
                      <td className="p-2">{poolDetails.startTime}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">EnableBlock</td>
                      <td className="p-2">{poolDetails.enableBlock ?? '--'}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">End Block</td>
                      <td className="p-2">{poolDetails.endTime}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Creator</td>
                      <td className="p-2">{poolDetails.deployer}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Limit</td>
                      <td className="p-2">{poolDetails.limit}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Binding Sat</td>
                      <td className="p-2">{poolDetails.bindingSat ?? poolDetails.n}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">On-chain Status</td>
                      <td className="p-2">{onchainStatusTextMap[String(poolDetails.status)] ?? poolDetails.status ?? '-'}({poolDetails.status})</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">DeployTickerTxId</td>
                      <td className="p-2">
                        {poolDetails.DeployTickerTxId ? (
                          <a href={generateMempoolUrl({
                            network: poolDetails.network || 'btc',
                            path: `tx/${poolDetails.DeployTickerTxId}`,
                            chain: poolDetails.network === 'satnet' ? Chain.SATNET : Chain.BTC,
                            env: poolDetails.env || 'prod',
                          })} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{hideStr(poolDetails.DeployTickerTxId, 6)}</a>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">MintTxId</td>
                      <td className="p-2">
                        {poolDetails.MintTxId ? (
                          <a href={generateMempoolUrl({
                            network: poolDetails.network || 'btc',
                            path: `tx/${poolDetails.MintTxId}`,
                            chain: poolDetails.network === 'satnet' ? Chain.SATNET : Chain.BTC,
                            env: poolDetails.env || 'prod',
                          })} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{hideStr(poolDetails.MintTxId, 6)}</a>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">AnchorTxId</td>
                      <td className="p-2">
                        {poolDetails.AnchorTxId ? (
                          <a href={generateMempoolUrl({
                            network: poolDetails.network || 'btc',
                            path: `tx/${poolDetails.AnchorTxId}`,
                            chain: poolDetails.network === 'satnet' ? Chain.SATNET : Chain.BTC,
                            env: poolDetails.env || 'prod',
                          })} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{hideStr(poolDetails.AnchorTxId, 6)}</a>
                        ) : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>



              <div className="flex space-x-4 mt-4">
                <WalletConnectBus asChild>
                  <Button
                    variant="outline"
                    className={`mt-2 w-36 sm:w-48 h-11 ${poolDetails.poolStatus === PoolStatus.ACTIVE ? 'btn-gradient' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'}`}
                    onClick={() => poolDetails.poolStatus === PoolStatus.ACTIVE && setShowJoinModal(true)}
                    disabled={poolDetails.poolStatus !== PoolStatus.ACTIVE}
                  >
                    Join Pool
                  </Button>
                </WalletConnectBus>
                <Button variant="outline" className="mt-2 w-36 sm:w-48 h-11" onClick={closeModal}>
                  Close
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="template">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Template Info - {poolDetails.templateName}</h3>
                <p className="text-zinc-400 mb-4">{poolDetails.templateDescription}</p>

                <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                  <thead className="bg-zinc-800">
                    <tr>
                      <th className="p-3 text-left">Parameter</th>
                      <th className="p-3 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poolDetails.templateParameters.map((param: any, index: number) => (
                      <tr key={index} className="border-b border-zinc-700">
                        <td className="p-3 font-medium text-zinc-400">{param.key}</td>
                        <td className="p-2">{param.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" className="w-full sm:w-48 mt-4" onClick={() => setActiveTab("basic")}>
                Back to Basic Info
              </Button>
            </TabsContent>

            {canViewParticipants() && (
              <TabsContent value="participants">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Participants Info</h3>
                  <div className="flex justify-between mb-3">
                    <p className="text-zinc-400">Total Participants: {participantsData.length}</p>
                    <p className="text-zinc-400">Total Deposited: --</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                      <thead className="bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="p-3 text-left whitespace-nowrap">Address</th>
                          <th className="p-3 text-left whitespace-nowrap">Amount</th>
                          <th className="p-3 text-left whitespace-nowrap">Allocated Tokens</th>
                          <th className="p-3 text-left whitespace-nowrap">Join Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantsData.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center p-4 text-zinc-400">暂无参与者</td>
                          </tr>
                        ) : (
                          participantsData.map((participant: any, index: number) => {
                            // 计算MintHistory中所有Amt的和
                            const mintHistory = participant.valid?.MintHistory || [];
                            const totalAmt = mintHistory.reduce((sum: number, item: any) => sum + (Number(item.Amt) || 0), 0);
                            return (
                              <tr key={index} className="border-b border-zinc-700">
                                <td className="p-3 whitespace-nowrap">{participant.address}</td>
                                <td className="p-3 whitespace-nowrap">{totalAmt || '--'}</td>
                                <td className="p-3 whitespace-nowrap">{totalAmt || '--'}</td>
                                <td className="p-3 whitespace-nowrap">--</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Button variant="outline" className="w-full sm:w-48 mt-4" onClick={() => setActiveTab("basic")}>
                  Back to Basic Info
                </Button>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
      {showJoinModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40" style={{ top: 0, left: 0 }}>
          <div className="relative z-70">
            <JoinPool closeModal={() => setShowJoinModal(false)} poolData={poolDetails} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LaunchPoolDetails;
