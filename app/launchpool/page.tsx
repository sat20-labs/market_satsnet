'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import JoinPool from '@/components/launchpool/JoinPool';
import LaunchPoolDetails from '@/components/launchpool/PoolDetail';
import LaunchPoolTemplate from '@/components/launchpool/[templateId]/TemplateDetailsClient';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
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
import { uniq } from 'lodash';

const protocol = 'default';
// supported contracts: [{"contractType":"launchpool.tc","ttl":0,"assetName":{"Protocol":"","Type":"","Ticker":""},"bindingSat":0,"limit":0,"maxSupply":0,"launchRation":0}  ]
// deployed contracts: []
// deploy contract launchpool.tc need 60766 sats
// use RemoteDeployContract to deploy a contract on core channel in server node



const protocolChange = (newProtocol) => { /* handle protocol change */ };
const onSortChange = (newInterval) => { /* handle sort change */ };

// 适配器函数：后端字段优先，没有则用前端字段
function adaptPoolData(pool, satsnetHeight) {
  const launchCap = (pool.maxSupply ?? pool.launchCap) && (pool.launchRation ?? 0)
    ? Math.floor((pool.maxSupply ?? pool.launchCap) * (pool.launchRation ?? 100) / 100)
    : (pool.launchCap ?? 0);

  const progress = launchCap
    ? Math.floor(((pool.TotalMinted ?? pool.progress ?? 0) / launchCap) * 100)
    : (pool.progress ?? 0);

  // 新的poolStatus逻辑
  let poolStatus = PoolStatus.NOT_STARTED;
  const status = Number(pool.status);
  const enableBlock = Number(pool.enableBlock);
  const endBlock = Number(pool.endBlock);
  if (status === 100) {
    if (!isNaN(enableBlock) && typeof satsnetHeight === 'number') {
      if (satsnetHeight < enableBlock) {
        poolStatus = PoolStatus.NOT_STARTED;
      } else if ((endBlock === 0 || satsnetHeight <= endBlock)) {
        poolStatus = PoolStatus.ACTIVE;
      } else if (endBlock !== 0 && satsnetHeight > endBlock) {
        poolStatus = PoolStatus.EXPIRED;
      }
    }
  } else {
    poolStatus = PoolStatus.NOT_STARTED;
  }

  return {
    ...pool,
    id: pool.contractURL ?? pool.id,
    logo: pool.logo ?? '',
    assetName: pool.assetName ?? pool.assetName,
    unitPrice: pool.unitPrice ?? '',
    marketCap: pool.marketCap ?? '',
    totalSupply: pool.maxSupply ?? pool.totalSupply ?? '',
    poolSize: pool.limit ?? pool.poolSize ?? '',
    launchCap,
    progress,
    protocol: pool.assetProtocol ?? pool.protocol ?? '',
    template: pool.template ?? '',
    templateName: pool.templateName ?? '',
    templateDescription: pool.templateDescription ?? '',
    templateParameters: pool.templateParameters ?? [],
    participantsList: pool.participantsList ?? [],
    startTime: pool.startBlock !== undefined && pool.startBlock !== null
      ? String(pool.startBlock)
      : (pool.startTime ?? ''),
    endTime: pool.endBlock !== undefined && pool.endBlock !== null
      ? String(pool.endBlock)
      : (pool.endTime ?? ''),
    statusCode: pool.status ?? '',
    status: PoolStatus.ACTIVE,
    poolStatus,
    deployTime: pool.deployTime ?? '',
  };
}

const LaunchPool = () => {
  const { t } = useTranslation();
  useSupportedContracts();
  const supportedContracts = useContractStore((state) => state.supportedContracts);
  console.log('supportedContracts', supportedContracts);
  const { satsnetHeight } = useCommonStore();
  const sortList = useMemo(
    () => [
      { label: t('common.time_1D'), value: 1 },
      { label: t('common.time_7D'), value: 7 },
      { label: t('common.time_30D'), value: 30 },
    ],
    [t],
  );

  const getPoolList = async () => {
    const result = await window.sat20.getDeployedContractsInServer();
    const { contractURLs = [] } = result;
    const list = contractURLs.filter(Boolean);
    console.log('getDeployedContractsInServer', list);

    // 串行请求每个合约状态
    const statusList: any[] = [];
    for (const item of list) {
      const result = await window.sat20.getDeployedContractStatus(item);
      const { contractStatus } = result;
      console.log('contractStatus', contractStatus && JSON.parse(contractStatus));
      if (contractStatus) {
        console.log('getDeployedContractsInServer', item);
        console.log('getDeployedContractsInServer', JSON.parse(contractStatus));
        statusList.push({
          ...JSON.parse(contractStatus),
          contractURL: item,
        });
      }
    }
    return statusList;
  };

  const { data: poolList = [] } = useQuery({
    queryKey: ['poolList'],
    queryFn: getPoolList,
    refetchInterval: 30000, // 每10秒自动刷新一次
  });
  console.log('poolList', poolList);

  // 用 useMemo 结合 poolList 和 satsnetHeight 生成渲染用 list
  const adaptedPoolList = useMemo(() => {
    return poolList.map(pool => adaptPoolData(pool, satsnetHeight));
  }, [poolList, satsnetHeight]);

  const columns = [
    { key: 'assetName', label: 'Asset Name' },
    { key: 'poolStatus', label: 'Pool Status' },
    { key: 'totalSupply', label: 'Total Supply' },
    { key: 'poolSize', label: 'Pool Size' },
    { key: 'deployTime', label: 'Deploy Time' },
    { key: 'startBlock', label: 'Start Block' },
    { key: 'endBlock', label: 'End Block' },
    { key: 'progress', label: 'Progress' },
    { key: 'action', label: 'Action' },
  ];

  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<any | null>(null);

  const openModal = async (type: string, pool: any | null = null) => {
    const result = await window.sat20.getParamForInvokeContract(pool.contractType)
    console.log('result:', result);
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

  // 自动提取所有协议类型，生成 tab 列表
  const protocolTabs = [
    { label: '全部', key: 'all' },
    { label: 'OrdX', key: 'ordx' },
    { label: 'Runes', key: 'runes' },
  ];

  // 根据当前 protocol 筛选池子，并按 deployTime 降序排序
  const filteredPoolList = useMemo(() => {
    let list = protocol === 'all' ? adaptedPoolList : adaptedPoolList.filter(pool => pool.protocol === protocol);
    return list.slice().sort((a, b) => Number(b.deployTime) - Number(a.deployTime));
  }, [adaptedPoolList, protocol]);

  return (
    <div className="p-4 relative">
      <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-1">
        <HomeTypeTabs value={protocol} onChange={protocolChange} tabs={protocolTabs} />
        <div className="flex items-center gap-2">
          <Button className="h-10 btn-gradient" onClick={() => (window.location.href = '/launchpool/create')}>
            Create Pool
          </Button>
        </div>
      </div>
      <div className="relative overflow-x-auto w-full px-3 pt-2 bg-zinc-900 rounded-lg">
        <Table className="w-full border-collapse rounded-lg shadow-md min-w-[900px] bg-background">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="px-4 py-2 text-left font-semibold text-muted-foreground bg-muted"
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
                className="border-b border-border hover:bg-accent transition-colors"
              >
                <TableCell className="flex items-center gap-2 px-4 py-2">
                  <Avatar className="w-8 h-8">
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
                <TableCell className="px-4 py-2">
                  <Badge className={`${statusColorMap[adaptedPool.poolStatus]} text-white`}>
                    {statusTextMap[adaptedPool.poolStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.totalSupply}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.poolSize}</TableCell>
                <TableCell className="px-4 py-2">
                  {adaptedPool.deployTime ? new Date(adaptedPool.deployTime * 1000).toLocaleString() : '-'}
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.startTime}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.endTime}</TableCell>
                <TableCell className="px-4 py-2 min-w-[120px]">
                  <div className="w-full bg-gray-200 h-2 rounded">
                    <div
                      className="bg-purple-500 h-2 rounded"
                      style={{ width: `${adaptedPool.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">{adaptedPool.progress}%</span>
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
            {modalType === 'distribute' && selectedPool && (
              <DistributionList participantsList={selectedPool.participantsList} closeModal={closeModal} />
            )}
            {modalType === 'autoDistribute' && (
              <div className="bg-zinc-900 p-6 rounded-lg shadow-md max-w-[600px]">
                <h2 className="text-xl font-bold mb-4">Auto Distribute Assets</h2>
                <p className="text-zinc-400 mb-4">
                  This operation will distribute assets based on the current participation ratio. Remaining assets will be added to the liquidity pool.
                </p>
                <p className="text-amber-500 mb-4">
                  Warning: This operation is irreversible. Are you sure you want to proceed?
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => {
                      alert('Auto distribution started!');
                      closeModal();
                    }}
                  >
                    Confirm Distribution
                  </Button>
                </div>
              </div>
            )}

            {modalType === 'autoRefund' && (
              <div className="bg-zinc-900 p-6 rounded-lg shadow-md max-w-[600px]">
                <h2 className="text-xl font-bold mb-4">Auto Refund</h2>
                <p className="text-zinc-400 mb-4">
                  This operation will cancel the pool and refund all participants to their original addresses. The pool will be marked as closed.
                </p>
                <p className="text-red-500 mb-4">
                  Warning: This operation is irreversible. Are you sure you want to proceed?
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      alert('Auto refund started!');
                      closeModal();
                    }}
                  >
                    Confirm Refund
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

export default LaunchPool;