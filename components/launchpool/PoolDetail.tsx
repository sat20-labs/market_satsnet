'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { PoolStatus, statusTextMap, statusColorMap } from '@/types/launchpool';

const LaunchPoolDetails = ({ closeModal, poolDetails }: { closeModal: () => void; poolDetails: any }) => {
  const canViewParticipants = () => {
    return [
      PoolStatus.ACTIVE,
      PoolStatus.FULL,
      PoolStatus.DISTRIBUTING,
      PoolStatus.COMPLETED,
      PoolStatus.EXPIRED,
      PoolStatus.EXPIRED_UNFILLED,
    ].includes(poolDetails.status);
  };

  const [activeTab, setActiveTabState] = React.useState<string>("basic");

  function setActiveTab(tab: string): void {
    setActiveTabState(tab);
  }

  return (
    <div className="p-6 w-full sm:w-[1360px] bg-zinc-900 rounded-lg shadow-lg relative">
      <div className="relative flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{poolDetails.assetName} 详情</h2>
        <button className="absolute top-0 right-0 text-zinc-400 hover:text-white" onClick={closeModal}>
          ✕
        </button>
      </div>

      <Tabs defaultValue="basic">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="template">合约模板</TabsTrigger>
          {canViewParticipants() && <TabsTrigger value="participants">参与详情</TabsTrigger>}
        </TabsList>

        <div className="h-[680px] overflow-y-auto">
          <TabsContent value="basic">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">池子状态</h3>
                <Badge className={`${statusColorMap[poolDetails.status]} text-white`}>
                  {statusTextMap[poolDetails.status]}
                </Badge>
              </div>
              <p className="text-zinc-400 mb-4">{poolDetails.description}</p>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">基本信息</h3>
              <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                <tbody>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400 w-1/3">单价</td>
                    <td className="p-2">{poolDetails.unitPrice}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">市值</td>
                    <td className="p-2">{poolDetails.marketCap}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">总供应量</td>
                    <td className="p-2">{poolDetails.totalSupply}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">池大小</td>
                    <td className="p-2">{poolDetails.poolSize}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">发射上限</td>
                    <td className="p-2">{poolDetails.launchCap}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">进度</td>
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
                    <td className="p-3 font-bold text-zinc-400">协议</td>
                    <td className="p-2">{poolDetails.protocol}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">开始时间</td>
                    <td className="p-2">{poolDetails.startTime}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">结束时间</td>
                    <td className="p-2">{poolDetails.endTime}</td>
                  </tr>
                  <tr className="border-b border-zinc-700">
                    <td className="p-3 font-bold text-zinc-400">创建者</td>
                    <td className="p-2">{poolDetails.creator}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex space-x-4 mt-4">
              {poolDetails.status === PoolStatus.ACTIVE && (
                <Button variant="outline" className="btn-gradient mt-2 w-36 sm:w-48 h-11">
                  加入池子
                </Button>
              )}
              <Button variant="outline" className="mt-2 w-36 sm:w-48 h-11" onClick={closeModal}>
                关闭
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="template">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">模板信息 - {poolDetails.templateName}</h3>
              <p className="text-zinc-400 mb-4">{poolDetails.templateDescription}</p>
              
              <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="p-3 text-left">参数</th>
                    <th className="p-3 text-left">值</th>
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
              返回基本信息
            </Button>
          </TabsContent>

          {canViewParticipants() && (
            <TabsContent value="participants">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">参与者信息</h3>
                <div className="flex justify-between mb-3">
                  <p className="text-zinc-400">总参与人数: {poolDetails.participants}</p>
                  <p className="text-zinc-400">总存入: {poolDetails.totalDeposited}</p>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                    <thead className="bg-zinc-800 sticky top-0">
                      <tr>
                        <th className="p-3 text-left">地址</th>
                        <th className="p-3 text-left">金额</th>
                        <th className="p-3 text-left">分配通证</th>
                        <th className="p-3 text-left">加入时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poolDetails.participantsList.map((participant: any, index: number) => (
                        <tr key={index} className="border-b border-zinc-700">
                          <td className="p-3">{participant.address}</td>
                          <td className="p-3">{participant.amount}</td>
                          <td className="p-3">{participant.allocationTokens}</td>
                          <td className="p-3">{participant.joinTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <Button variant="outline" className="w-full sm:w-48 mt-4" onClick={() => setActiveTab("basic")}>
                返回基本信息
              </Button>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default LaunchPoolDetails;
