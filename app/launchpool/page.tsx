'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import JoinPool from '@/components/launchpool/JoinPool';
import LaunchPoolDetails from '@/components/launchpool/PoolDetail';
import LaunchPoolTemplate from '@/components/launchpool/[templateId]/TemplateDetailsClient';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { Badge } from '@/components/ui/badge';
import { PoolStatus, statusTextMap, statusColorMap } from '@/types/launchpool';
import { satsToBitcoin, formatBtcAmount, formatLargeNumber } from '@/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Suspense } from 'react';

import { SortDropdown } from '@/components/SortDropdown';
import { useTranslation } from 'react-i18next';
import DistributionList from '@/components/launchpool/DistributionList';
import ActionButtons from '@/components/launchpool/ActionButtons';

const protocol = 'default';
const interval = 1;
const isLoading = false;

const protocolChange = (newProtocol) => { /* handle protocol change */ };
const onSortChange = (newInterval) => { /* handle sort change */ };

const LaunchPool = () => {
  const { t } = useTranslation();

  const sortList = useMemo(
    () => [
      { label: t('common.time_1D'), value: 1 },
      { label: t('common.time_7D'), value: 7 },
      { label: t('common.time_30D'), value: 30 },
    ],
    [t],
  );

  const [poolList, setPools] = useState([
    {
      id: 1,
      logo: '',
      assetName: 'OrdX005',
      unitPrice: '0.001 BTC',
      marketCap: '10 BTC',
      totalSupply: '100,000,000',
      poolSize: '80,000,000',
      launchCap: '48,000,000',
      progress: 60,
      protocol: 'ORDX',
      template: 'Template001',
      templateName: 'Standard Template',
      templateDescription: 'A standard launch pool template with timed release schedule.',
      templateParameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
      ],
      participantsList: [
        { address: '0xabc...def1', amount: '0.05 BTC', allocationTokens: '50,000', joinTime: '2025-05-02 13:45' },
        { address: '0xghi...jkl2', amount: '0.12 BTC', allocationTokens: '120,000', joinTime: '2025-05-03 09:22' },
      ],
      startTime: '2025-05-01 12:00',
      endTime: '2025-05-15 12:00',
      status: PoolStatus.ACTIVE,
    },
    {
      id: 2,
      logo: '',
      assetName: 'Runes.Test.Sat20',
      unitPrice: '0.001 BTC',
      marketCap: '100 BTC',
      totalSupply: '1,000,000,000',
      poolSize: '800,000,000',
      launchCap: '400,000,000',
      progress: 50,
      protocol: 'Runes',
      template: 'Template002',
      templateName: 'Standard Template',
      templateDescription: 'A standard launch pool template with timed release schedule.',
      templateParameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
      ],
      participantsList: [
        { address: '0xabc...def1', amount: '0.05 BTC', allocationTokens: '50,000', joinTime: '2025-05-02 13:45' },
        { address: '0xghi...jkl2', amount: '0.12 BTC', allocationTokens: '120,000', joinTime: '2025-05-03 09:22' },
      ],
      startTime: '2025-05-11 12:00',
      endTime: '2025-05-18 12:00',
      status: PoolStatus.NOT_STARTED,
    },
    {
      id: 3,
      logo: '',
      assetName: 'FULL.Demo',
      unitPrice: '0.002 BTC',
      marketCap: '20 BTC',
      totalSupply: '150,000,000',
      poolSize: '100,000,000',
      launchCap: '100,000,000',
      progress: 100,
      protocol: 'ORDX',
      template: 'Template003',
      templateName: 'Standard Template',
      templateDescription: 'A standard launch pool template with timed release schedule.',
      templateParameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
      ],
      participantsList: [
        { address: '0xabc...def1', amount: '0.05 BTC', allocationTokens: '50,000', joinTime: '2025-05-02 13:45' },
        { address: '0xghi...jkl2', amount: '0.12 BTC', allocationTokens: '120,000', joinTime: '2025-05-03 09:22' },
      ],
      startTime: '2025-04-01 12:00',
      endTime: '2025-05-30 12:00',
      status: PoolStatus.FULL,
    },
    {
      id: 4,
      logo: '',
      assetName: 'DIST.Demo',
      unitPrice: '0.003 BTC',
      marketCap: '30 BTC',
      totalSupply: '200,000,000',
      poolSize: '150,000,000',
      launchCap: '150,000,000',
      progress: 100,
      protocol: 'BRC20',
      template: 'Template001',
      templateName: 'Standard Template',
      templateDescription: 'A standard launch pool template with timed release schedule.',
      templateParameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
      ],
      participantsList: [
        { address: '0xabc...def1', amount: '0.05 BTC', allocationTokens: '50,000', joinTime: '2025-05-02 13:45' },
        { address: '0xghi...jkl2', amount: '0.12 BTC', allocationTokens: '120,000', joinTime: '2025-05-03 09:22' },
      ],
      startTime: '2025-01-01 12:00',
      endTime: '2025-02-15 12:00',
      status: PoolStatus.DISTRIBUTING,
    },
    {
      id: 5,
      logo: '',
      assetName: 'COMP.Demo',
      unitPrice: '0.002 BTC',
      marketCap: '25 BTC',
      totalSupply: '180,000,000',
      poolSize: '120,000,000',
      launchCap: '120,000,000',
      progress: 100,
      protocol: 'Runes',
      template: 'Template002',
      templateName: 'Standard Template',
      templateDescription: 'A standard launch pool template with timed release schedule.',
      templateParameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
      ],
      participantsList: [
        { address: '0xabc...def1', amount: '0.05 BTC', allocationTokens: '50,000', joinTime: '2025-05-02 13:45' },
        { address: '0xghi...jkl2', amount: '0.12 BTC', allocationTokens: '120,000', joinTime: '2025-05-03 09:22' },
      ],
      startTime: '2024-10-01 12:00',
      endTime: '2024-11-15 12:00',
      status: PoolStatus.COMPLETED,
    },
    {
      id: 6,
      logo: '',
      assetName: 'EXP.Demo',
      unitPrice: '0.001 BTC',
      marketCap: '15 BTC',
      totalSupply: '120,000,000',
      poolSize: '90,000,000',
      launchCap: '60,000,000',
      progress: 70,
      protocol: 'BRC20',
      template: 'Template003',
      templateName: 'Standard Template',
      templateDescription: 'A standard launch pool template with timed release schedule.',
      templateParameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
      ],
      participantsList: [
        { address: '0xabc...def1', amount: '0.05 BTC', allocationTokens: '50,000', joinTime: '2025-05-02 13:45' },
        { address: '0xghi...jkl2', amount: '0.12 BTC', allocationTokens: '120,000', joinTime: '2025-05-03 09:22' },
      ],
      startTime: '2024-08-01 12:00',
      endTime: '2024-09-15 12:00',
      status: PoolStatus.EXPIRED,
    },
    {
      id: 7,
      logo: '',
      assetName: 'EXP.UnFilled',
      unitPrice: '0.001 BTC',
      marketCap: '15 BTC',
      totalSupply: '120,000,000',
      poolSize: '90,000,000',
      launchCap: '60,000,000',
      progress: 40,
      protocol: 'BRC20',
      template: 'Template003',
      templateName: 'Standard Template',
      templateDescription: 'A standard launch pool template with timed release schedule.',
      templateParameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
      ],
      participantsList: [
        { address: '0xabc...def1', amount: '0.05 BTC', allocationTokens: '50,000', joinTime: '2025-05-02 13:45' },
        { address: '0xghi...jkl2', amount: '0.12 BTC', allocationTokens: '120,000', joinTime: '2025-05-03 09:22' },
      ],
      startTime: '2024-08-01 12:00',
      endTime: '2024-09-15 12:00',
      status: PoolStatus.EXPIRED_UNFILLED,
    },
  ]);

  const columns = [
    { key: 'assetName', label: 'Asset Name' },
    { key: 'status', label: 'Pool Status' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'marketCap', label: 'Market Cap' },
    { key: 'totalSupply', label: 'Total Supply' },
    { key: 'poolSize', label: 'Pool Size' },
    { key: 'launchCap', label: 'Launch Cap' },    
    // { key: 'contract', label: 'C.Template' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'endTime', label: 'End Time' },
    { key: 'progress', label: 'Progress' },
    { key: 'action', label: 'Action' },
  ];

  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<any | null>(null);

  const openModal = (type: string, pool: any | null = null) => {
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

  return (
    <div className="p-4 relative">
      <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-1">
        <HomeTypeTabs value={protocol} onChange={protocolChange} />
        <div className="flex items-center gap-2">
          <Button className="h-10 btn-gradient" onClick={() => (window.location.href = '/launchpool/create')}>
            Create Pool
          </Button>
        </div>
      </div>
      <div className="relative overflow-x-auto w-full px-3 pt-2 bg-zinc-900 rounded-lg">
        <Table className="w-full border-collapse rounded-lg shadow-md min-w-[800px]">
          <TableHeader className="bg-gray-800 text-zinc-300">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`p-2 ${column.key === 'contract' ? 'text-center' : 'text-left'} whitespace-nowrap`}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <tbody>
            {poolList.map((pool, index) => (
              <tr key={index} className="border-b border-gray-700 hover:bg-gray-800/50 text-zinc-400 transition-colors duration-200">
                <td className="flex justify-start mt-2 items-center p-2 gap-1 whitespace-nowrap">
                  {pool.logo ? (
                    <img src={pool.logo} alt="Logo" className="w-10 h-10" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-600 text-white text-lg font-bold flex items-center justify-center rounded-full">
                      {pool.assetName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>{pool.assetName}</div>
                </td>
                <td className="p-2 whitespace-nowrap">
                  <Badge className={`${statusColorMap[pool.status]} text-white`}>
                    {statusTextMap[pool.status]}
                  </Badge>
                </td>
                <td className="p-2 whitespace-nowrap">{pool.unitPrice}</td>
                <td className="p-2 whitespace-nowrap">{pool.marketCap}</td>
                <td className="p-2 whitespace-nowrap">{pool.totalSupply}</td>
                <td className="p-2 whitespace-nowrap">{pool.poolSize}</td>
                <td className="p-2 whitespace-nowrap">{pool.launchCap}</td>                
                {/* <td className="p-2 whitespace-nowrap">{pool.templateName}</td> */}
                <td className="p-2 whitespace-nowrap">{pool.startTime}</td>
                <td className="p-2 whitespace-nowrap">{pool.endTime}</td>
                <td className="p-2 whitespace-nowrap">
                  <div className="w-full bg-gray-200 h-2 rounded">
                    <div className="bg-purple-500 h-2 rounded" style={{ width: `${pool.progress}%` }}></div>
                    <span className="mb-4 text-xs text-zinc-400">{pool.progress}%</span>
                  </div>
                </td>
                <td className="p-2 text-center wrap-normal whitespace-nowrap relative">
                  <ActionButtons pool={pool} openModal={openModal} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="relative z-501">
            {modalType === 'join' && <JoinPool closeModal={closeModal} />}
            {modalType === 'details' && <LaunchPoolDetails closeModal={closeModal} poolDetails={selectedPool} />}
            {modalType === 'template' && (
              <LaunchPoolTemplate templateId={selectedTemplateId || ''} closeModal={closeModal} />
            )}
            {modalType === 'distribute' && (
              <div className="bg-zinc-900 p-6 rounded-lg shadow-md max-w-[600px]">
                <h2 className="text-xl font-bold mb-4">Distribute Assets</h2>
                <p className="text-zinc-400">Start distributing assets based on user participation ratio...</p>
                <Button className="mt-4" onClick={closeModal}>Close</Button>
              </div>
            )}
            {modalType === 'distribution' && selectedPool && (
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