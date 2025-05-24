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
                  <Badge className={`${statusColorMap[poolDetails.status]} text-white`}>
                    {statusTextMap[poolDetails.status]}
                  </Badge>
                </div>
                <p className="text-zinc-400 mb-4">{poolDetails.description}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
                <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                  <tbody>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 w-1/3">Status</td>
                      <td className="p-2">
                        <Badge className={`${statusColorMap[poolDetails.status]} text-white`}>
                          {statusTextMap[poolDetails.status]}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Total Supply</td>
                      <td className="p-2">{poolDetails.totalSupply}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Pool Size</td>
                      <td className="p-2">{poolDetails.poolSize}</td>
                    </tr>
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
                      <td className="p-3 font-bold text-zinc-400">End Block</td>
                      <td className="p-2">{poolDetails.endTime}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400">Creator</td>
                      <td className="p-2">{poolDetails.deployer}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="flex space-x-4 mt-4">
                {poolDetails.status === PoolStatus.ACTIVE && (
                  <Button variant="outline" className="btn-gradient mt-2 w-36 sm:w-48 h-11">
                    Join Pool
                  </Button>
                )}
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
                    <p className="text-zinc-400">Total Participants: {poolDetails.participants}</p>
                    <p className="text-zinc-400">Total Deposited: {poolDetails.totalDeposited}</p>
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
                        {poolDetails.participantsList.map((participant: any, index: number) => (
                          <tr key={index} className="border-b border-zinc-700">
                            <td className="p-3 whitespace-nowrap">{participant.address}</td>
                            <td className="p-3 whitespace-nowrap">{participant.amount}</td>
                            <td className="p-3 whitespace-nowrap">{participant.allocationTokens}</td>
                            <td className="p-3 whitespace-nowrap">{participant.joinTime}</td>
                          </tr>
                        ))}
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
    </div>
  );
};

export default LaunchPoolDetails;
