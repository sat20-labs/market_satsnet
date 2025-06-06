'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import JoinPool from '@/components/launchpool/JoinPool';
import LaunchPoolDetails from '@/components/launchpool/PoolDetail';
import LaunchPoolTemplate from '@/components/launchpool/[templateId]/TemplateDetailsClient';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Badge } from '@/components/ui/badge';
import { PoolStatus, statusTextMap, statusColorMap } from '@/types/launchpool';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useTranslation } from 'react-i18next';
import DistributionList from '@/components/launchpool/DistributionList';
import ActionButtons from '@/components/launchpool/ActionButtons';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import { useSupportedContracts } from '@/lib/hooks/useSupportedContracts';
import { useContractStore } from '@/store/contract';


function adaptPoolData(pool, satsnetHeight) {
  // 适配 contractStatus 结构
  const assetNameObj = pool.assetName || {};
  const ticker = assetNameObj.Ticker || '-';
  const protocol = assetNameObj.Protocol || '-';
  // 状态适配
  let poolStatus = PoolStatus.NOT_STARTED;
  const status = Number(pool.status);
  if (status === 100) {
    poolStatus = PoolStatus.ACTIVE;
  } else if (status === 200) {
    poolStatus = PoolStatus.COMPLETED;
  } else if (status === -1) {
    poolStatus = PoolStatus.CLOSED;
  } else if (status === -2) {
    poolStatus = PoolStatus.EXPIRED;
  } else {
    poolStatus = PoolStatus.NOT_STARTED;
  }

  return {
    ...pool,
    id: pool.contractURL ?? pool.id,
    assetName: ticker,
    protocol: protocol,
    poolStatus,
    deployTime: pool.deployTime ?? '',
    dealPrice: pool.dealPrice ?? '-',
    satsValueInPool: pool.SatsValueInPool ?? '-',
    totalDealSats: pool.TotalDealSats ?? '-',
    totalDealCount: pool.TotalDealCount ?? '-',
    // 其它字段可按需补充
  };
}

const Swap = () => {
  const { t, ready } = useTranslation(); // Specify the namespace 
  console.log('Translation for launchpool.asset_name:', t('launchpool.asset_name')); // Debugging: Check translation key

  useSupportedContracts();
  const supportedContracts = useContractStore((state) => state.supportedContracts);
  const { satsnetHeight } = useCommonStore();
  const sortList = useMemo(
    () => [
      { label: t('common.time_1D'), value: 1 },
      { label: t('common.time_7D'), value: 7 },
      { label: t('common.time_30D'), value: 30 },
    ],
    [t],
  );

  const getSwapList = async () => {
    const result = await window.sat20.getDeployedContractsInServer();
    console.log('result', result);
    const { contractURLs = [] } = result;

    const list = contractURLs.filter(c => c.includes('swap.tc'));
    console.log('list', list);
    const statusList: any[] = [];
    for (const item of list) {
      console.log('item', item);
   
      const result = await window.sat20.getDeployedContractStatus(item);
      console.log('result', result);
      const { contractStatus } = result;
      if (contractStatus) {
        statusList.push({
          ...JSON.parse(contractStatus),
          contractURL: item,
        });
      }
    }
    return statusList;
  };

  const { data: poolList = [] } = useQuery({
    queryKey: ['swapList'],
    queryFn: getSwapList,
    gcTime: 0,
    // refetchInterval: 60000,
  });

  const adaptedPoolList = useMemo(() => {
    return poolList.map(pool => adaptPoolData(pool, satsnetHeight));
  }, [poolList, satsnetHeight]);
  console.log('adaptedPoolList', satsnetHeight);
  console.log('adaptedPoolList', poolList);
  const columns = [
    { key: 'assetName', label: t('pages.launchpool.asset_name') },
    { key: 'protocol', label: t('Protocol') },
    { key: 'poolStatus', label: t('pages.launchpool.pool_status') },
    { key: 'dealPrice', label: t('Price') },
    { key: 'satsValueInPool', label: t('Sats In Pool') },
    { key: 'totalDealSats', label: t('Total Deal Sats') },
    { key: 'totalDealCount', label: t('Total Deal Count') },
    { key: 'deployTime', label: t('pages.launchpool.deploy_time') },
    { key: 'action', label: t('pages.launchpool.action') },
  ];

  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<any | null>(null);

  const openModal = async (type: string, pool: any | null = null) => {
    const result = await window.sat20.getParamForInvokeContract(pool.contractType);
    setModalType(type);
    if (type === 'template' && pool) {
      setSelectedTemplateId(pool.template);
    }
    setSelectedPool(pool);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTemplateId(null);
    setSelectedPool(null);
  };

  const [protocol, setProtocol] = useState('all');
  const protocolChange = (newProtocol) => setProtocol(newProtocol);

  const protocolTabs = [
    { label: t('pages.launchpool.all'), key: 'all' },
    { label: t('pages.launchpool.ordx'), key: 'ordx' },
    { label: t('pages.launchpool.runes'), key: 'runes' },
  ];

  const filteredPoolList = useMemo(() => {
    let list = protocol === 'all' ? adaptedPoolList : adaptedPoolList.filter(pool => pool.protocol === protocol);
    return list.slice().sort((a, b) => Number(b.deployTime) - Number(a.deployTime));
  }, [adaptedPoolList, protocol]);
  console.log('filteredPoolList', filteredPoolList);
  
  return (
    <div className="p-4 relative">
      <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-1">
        <HomeTypeTabs value={protocol} onChange={protocolChange} tabs={protocolTabs} />
        <div className="flex items-center gap-2 mr-4">
          <WalletConnectBus asChild>
            <Button className="h-10 btn-gradient" onClick={() => (window.location.href = '/swap/create')}>
              Create Swap
            </Button>
          </WalletConnectBus>
        </div>
      </div>
      <div className="relative overflow-x-auto w-full px-3 py-4 bg-zinc-950/50 rounded-lg">
        <Table className="w-full table-auto border-collapse rounded-lg shadow-md min-w-[900px] bg-zinc-950/50">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap"
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPoolList.map((adaptedPool, index) => (
              <TableRow
                key={adaptedPool.id ?? index}
                className="border-b border-border hover:bg-accent transition-colors  whitespace-nowrap"
              >
                <TableCell className="flex items-center gap-2 px-4 py-2">
                  <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                    <AvatarImage src={adaptedPool.logo} alt="Logo" />
                    <AvatarFallback>
                      {adaptedPool.assetName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="cursor-pointer text-primary hover:underline"
                    onClick={() => openModal('details', adaptedPool)}
                  >
                    {adaptedPool.assetName}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.protocol}</TableCell>
                <TableCell className="px-4 py-2">
                  <Badge className={`${statusColorMap[adaptedPool.poolStatus]} text-white`}>
                    {statusTextMap[adaptedPool.poolStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.dealPrice}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.satsValueInPool}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.totalDealSats}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.totalDealCount}</TableCell>
                <TableCell className="px-4 py-2">
                  {adaptedPool.deployTime ? new Date(adaptedPool.deployTime * 1000).toLocaleString() : '-'}
                </TableCell>
                <TableCell className="px-4 py-2 text-center">
                  <ActionButtons pool={adaptedPool} openModal={openModal} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="relative z-501">
            {modalType === 'join' && <JoinPool poolData={selectedPool} closeModal={closeModal} />}
            {modalType === 'details' && <LaunchPoolDetails closeModal={closeModal} poolDetails={selectedPool} />}
            {modalType === 'template' && (
              <LaunchPoolTemplate templateId={selectedTemplateId || ''} closeModal={closeModal} />
            )}
            {modalType === 'distribution' && (
              <DistributionList contractURL={selectedPool.contractURL} closeModal={closeModal} bindingSat={selectedPool.bindingSat} />
            )}
            {modalType === 'autoDistribute' && (
              <div className="bg-zinc-900 p-6 rounded-lg shadow-md max-w-[600px]">
                <h2 className="text-xl font-bold mb-4">{t('launchpool.auto_distribute_title')}</h2>
                <p className="text-zinc-400 mb-4">{t('launchpool.auto_distribute_description')}</p>
                <p className="text-amber-500 mb-4">{t('launchpool.auto_distribute_warning')}</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={closeModal}>{t('launchpool.cancel')}</Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => {
                      alert(t('launchpool.auto_distribute_alert'));
                      closeModal();
                    }}
                  >
                    {t('launchpool.confirm_distribution')}
                  </Button>
                </div>
              </div>
            )}

            {modalType === 'autoRefund' && (
              <div className="bg-zinc-900 p-6 rounded-lg shadow-md max-w-[600px]">
                <h2 className="text-xl font-bold mb-4">{t('launchpool.auto_refund_title')}</h2>
                <p className="text-zinc-400 mb-4">{t('launchpool.auto_refund_description')}</p>
                <p className="text-red-500 mb-4">{t('launchpool.auto_refund_warning')}</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={closeModal}>{t('launchpool.cancel')}</Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      alert(t('launchpool.auto_refund_alert'));
                      closeModal();
                    }}
                  >
                    {t('launchpool.confirm_refund')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Swap;