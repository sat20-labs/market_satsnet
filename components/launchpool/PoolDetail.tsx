'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { PoolStatus, statusTextMap, statusColorMap } from '@/types/launchpool';
import JoinPool from './JoinPool';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';
import { hideStr } from '@/utils';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { WalletConnectBus } from '../wallet/WalletConnectBus';
import { useCommonStore } from '@/store/common';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from "@iconify/react";

const LaunchPoolDetails = ({ closeModal, poolDetails }: { closeModal: () => void; poolDetails: any }) => {
  const { t } = useTranslation(); // Specify the namespace
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

  const [tabValue, setTabValue] = React.useState<string>("basic");
  const [showJoinModal, setShowJoinModal] = React.useState(false);

  const fetchParticipants = async () => {
    if (!poolDetails?.contractURL) return [];
    try {
      const result = await window.sat20.getAllAddressInContract(poolDetails.contractURL);
      const list = JSON.parse(result.addresses)?.data || [];
      const resultStatusList: any[] = [];
      for (const item of list) {
        const { status } = await window.sat20.getAddressStatusInContract(poolDetails.contractURL, item.address);
        resultStatusList.push({
          ...item,
          ...JSON.parse(status)
        });
      }
      resultStatusList.sort((a, b) => (a.address > b.address ? 1 : -1));
      return resultStatusList;
    } catch (e) {
      console.error(t('pages.poolDetail.fetch_error'), e);
      return [];
    }
  };

  const { data: participantsData = [], isLoading: isParticipantsLoading } = useQuery({
    queryKey: ['participants', poolDetails?.contractURL],
    queryFn: fetchParticipants,
    enabled: canViewParticipants() && !!poolDetails?.contractURL,
    refetchInterval: 2000,
  });

  const onchainStatusTextMap = {
    '-2': t('pages.poolDetail.status.expired'),
    '-1': t('pages.poolDetail.status.closed'),
    '0': t('pages.poolDetail.status.init'),
    '100': t('pages.poolDetail.status.ready'),
    '200': t('pages.poolDetail.status.closing'),
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 overflow-y-auto">
      <div className="p-6 bg-zinc-900 rounded-lg shadow-lg relative w-full max-w-[1360px] mx-auto mt-10 sm:mt-0 overflow-hidden">
        <div className="relative flex justify-between items-center mb-4">
          <h2 className="flex justify-between items-center text-xl font-bold">
            <Avatar className="w-10 h-10 mr-2">
              <AvatarImage src={poolDetails.logo} alt="Logo" />
              <AvatarFallback>
                {poolDetails.assetSymbol
                  ? String.fromCodePoint(poolDetails.assetSymbol)
                  : poolDetails.assetName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {poolDetails.assetName}
          </h2>
          <button className="absolute top-0 right-0 text-zinc-400 hover:text-white" onClick={closeModal}>
            ✕
          </button>
        </div>

        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="w-full grid grid-cols-3 h-10 mb-4">
            <TabsTrigger value="basic" className='h-full'>{t('pages.poolDetail.tabs.basic_info')}</TabsTrigger>
            <TabsTrigger value="template">{t('pages.poolDetail.tabs.contract_template')}</TabsTrigger>
            {canViewParticipants() && <TabsTrigger value="participants">{t('pages.poolDetail.tabs.participants')}</TabsTrigger>}
          </TabsList>

          <div className="h-[600px] overflow-y-auto">
            <TabsContent value="basic">
              <div className="mb-4">
                <div className="text-zinc-200 text-sm font-bold my-2">
                  {t('pages.poolDetail.current_height')}: <span className='text-green-400'>{satsnetHeight}</span>
                </div>

                <table className="w-full table-auto border-collapse border border-gray-700 rounded-lg shadow-md">
                  <tbody>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 w-1/3 whitespace-nowrap">{t('pages.poolDetail.status_label')}</td>
                      <td className="p-2 whitespace-nowrap">
                        <Badge className={`${statusColorMap[poolDetails.poolStatus]} text-white`}>
                          {statusTextMap[poolDetails.poolStatus]}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.total_supply')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.totalSupply}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.launch_cap')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.launchCap}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.progress')}</td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="w-full bg-gray-600/50 h-2 rounded">
                          <div
                            className="bg-purple-500 h-2 rounded"
                            style={{ width: `${poolDetails.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-zinc-400 mt-1">{poolDetails.progress}%</span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.protocol')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.protocol}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.start_block')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.startTime}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.enable_block')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.enableBlock ?? '--'}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.end_block')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.endTime}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.creator')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.deployer}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.limit')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.limit}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.binding_sat')}</td>
                      <td className="p-2 whitespace-nowrap">{poolDetails.bindingSat ?? poolDetails.n}</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.onchain_status')}</td>
                      <td className="p-2 whitespace-nowrap">{onchainStatusTextMap[String(poolDetails.status)] ?? poolDetails.status ?? '-'}({poolDetails.status})</td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.deploy_ticker_txid')}</td>
                      <td className="p-2 flex justify-start items-center whitespace-nowrap">
                        {poolDetails.DeployTickerTxId ? (
                          <a href={generateMempoolUrl({
                            network: 'testnet',
                            path: `tx/${poolDetails.DeployTickerTxId}`,
                            chain: poolDetails.network === 'satnet' ? Chain.SATNET : Chain.BTC,
                            env: poolDetails.env || 'prod',
                          })} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{hideStr(poolDetails.DeployTickerTxId, 6)}</a>
                        ) : '-'}
                        <Icon icon="lucide:square-arrow-out-up-right" className='w-5 h-5 ml-2 text-zinc-500'/>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.mint_txid')}</td>
                      <td className="p-2 flex justify-start items-center whitespace-nowrap">
                        {poolDetails.MintTxId ? (
                          <a href={generateMempoolUrl({
                            network: 'testnet',
                            path: `tx/${poolDetails.MintTxId}`,
                            chain: poolDetails.network === 'satnet' ? Chain.SATNET : Chain.BTC,
                            env: poolDetails.env || 'prod',
                          })} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{hideStr(poolDetails.MintTxId, 6)}</a>
                        ) : '-'}
                        <Icon icon="lucide:square-arrow-out-up-right" className='w-5 h-5 ml-2 text-zinc-500'/>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700">
                      <td className="p-3 font-bold text-zinc-400 whitespace-nowrap">{t('pages.poolDetail.anchor_txid')}</td>
                      <td className="p-2 flex justify-start items-center whitespace-nowrap">
                        {poolDetails.AnchorTxId ? (
                          <a href={generateMempoolUrl({
                            network: 'testnet',
                            path: `tx/${poolDetails.AnchorTxId}`,
                            chain: poolDetails.network === 'satnet' ? Chain.SATNET : Chain.BTC,
                            env: poolDetails.env || 'prod',
                          })} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{hideStr(poolDetails.AnchorTxId, 6)}</a>
                        ) : '-'}
                        <Icon icon="lucide:square-arrow-out-up-right" className='w-5 h-5 ml-2 text-zinc-500'/>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex space-x-4 my-4">
                <WalletConnectBus asChild>
                  <Button
                    variant="outline"
                    className={`mt-2 w-36 sm:w-48 h-11 text-base text-zinc-300 ${poolDetails.poolStatus === PoolStatus.ACTIVE ? 'btn-gradient' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'}`}
                    onClick={() => poolDetails.poolStatus === PoolStatus.ACTIVE && setShowJoinModal(true)}
                    disabled={poolDetails.poolStatus !== PoolStatus.ACTIVE}
                  >
                    {t('pages.poolDetail.join_pool')}
                  </Button>
                </WalletConnectBus>
                <Button variant="outline" className="mt-2 w-36 sm:w-48 h-11 text-base text-zinc-300" onClick={closeModal}>
                  {t('pages.poolDetail.close')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="template">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{t('pages.poolDetail.template_info')} - {poolDetails.templateName}</h3>
                <p className="text-zinc-400 mb-4">{poolDetails.templateDescription}</p>

                <div className="mt-6">
                  <pre className="bg-zinc-800 text-zinc-100 rounded p-4 overflow-x-auto text-sm">
                    {`{
  "contractType": "launchpool.tc",
  "ttl": 0,
  "assetName": {"Protocol": "", "Type": "", "Ticker": ""},
  "bindingSat": 0,
  "limit": 0,
  "maxSupply": 0,
  "launchRation": 0
}`}
                  </pre>
                </div>
              </div>

              <Button variant="outline" className="w-full sm:w-60 h-11 mt-4 text-zinc-300 text-base" onClick={() => setTabValue("basic")}>               
                {t('pages.poolDetail.back_to_basic')}
              </Button>
            </TabsContent>

            {canViewParticipants() && (
              <TabsContent value="participants">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">{t('pages.poolDetail.participants_info')}</h3>
                  <div className="flex justify-between mb-3">
                    <p className="text-zinc-400">{t('pages.poolDetail.total_participants')}: {participantsData.length}</p>
                    <p className="text-zinc-400">{t('pages.poolDetail.total_deposited')}: --</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-700 rounded-lg shadow-md">
                      <thead className="bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="p-3 text-left whitespace-nowrap">{t('pages.poolDetail.address')}</th>
                          <th className="p-3 text-left whitespace-nowrap">{t('pages.poolDetail.amount')}</th>
                          <th className="p-3 text-left whitespace-nowrap">{t('pages.poolDetail.allocated_tokens')}</th>
                          <th className="p-3 text-left whitespace-nowrap">{t('pages.poolDetail.join_time')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantsData.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center p-4 text-zinc-400">{t('pages.poolDetail.no_participants')}</td>
                          </tr>
                        ) : (
                          participantsData.map((participant: any, index: number) => {
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

                <Button variant="outline" className="w-full sm:w-48 mt-4 text-base text-zinc-300" onClick={() => setTabValue("basic")}>
                  {t('pages.poolDetail.back_to_basic')}
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
