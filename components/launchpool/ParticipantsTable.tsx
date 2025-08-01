import React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';
import { marketApi } from '@/api';

interface ParticipantsTableProps {
  contractURL: string;
  bindingSat: number;
  showIndex?: boolean;
  showMintHistory?: boolean;
  tableHeaders?: string[];
  onClose?: () => void;
}

const fetchParticipants = async (contractURL: string, bindingSat: number, pageStart: number = 0, pageLimit: number = 0) => {
  if (!contractURL) return [];
  try {
    // 获取所有地址
    const { status } = await marketApi.getContractAllAddresses(contractURL, pageStart, pageLimit);
    console.log('status', status);

    const list = JSON.parse(status)?.data || [];
    const resultStatusList: any[] = [];
    for (const item of list) {
      // 获取每个地址的状态
      const { status: statusRes } = await marketApi.getContractStatusByAddress(contractURL, item.address);
      resultStatusList.push({
        ...item,
        ...JSON.parse(statusRes)
      });
    }
    resultStatusList.sort((a, b) => (a.address > b.address ? 1 : -1));
    return resultStatusList.map(v => {
      // 获取数量值，考虑精度
      const totalMint = v.valid?.TotalMint;
      let amount = 0;
      if (totalMint?.Value !== undefined && totalMint?.Precision !== undefined) {
        // 根据精度计算实际数量
        amount = totalMint.Value / Math.pow(10, totalMint.Precision);
      }
      
      return {
        ...v,
        amount: amount,
        sats: Math.floor((amount + bindingSat - 1) / bindingSat),
      };
    });
  } catch (e) {
    return [];
  }
};

const ParticipantsTable: React.FC<ParticipantsTableProps> = ({
  contractURL,
  bindingSat,
  showIndex = false,
  showMintHistory = false,
  tableHeaders = ['地址', '资产数量/聪'],
  onClose,
}) => {
  const { data: participantsList = [], isLoading } = useQuery({
    queryKey: ['participants', contractURL, bindingSat],
    queryFn: () => fetchParticipants(contractURL, bindingSat, 0, 0),
    enabled: !!contractURL,
  });
  console.log('participantsList', participantsList);
  // 适配 amount 字段
  const adaptedList = participantsList.map((participant: any) => {
    // 获取数量值，考虑精度
    const totalMint = participant.valid?.TotalMint;
    let amount = 0;
    if (totalMint?.Value !== undefined && totalMint?.Precision !== undefined) {
      // 根据精度计算实际数量
      amount = totalMint.Value / Math.pow(10, totalMint.Precision);
    }
    
    const sats = Math.floor((amount + bindingSat - 1) / bindingSat);
    console.log('totalMint', totalMint);
    console.log('amount', amount);
    console.log('sats', sats);
    console.log('bindingSat', bindingSat);
    return {
      ...participant,
      amount: amount,
      sats: sats
    };
  });

  // 展开行状态
  const [expandedRows, setExpandedRows] = React.useState<string[]>([]);
  const handleToggleRow = (address: string) => {
    setExpandedRows(prev =>
      prev.includes(address)
        ? prev.filter(a => a !== address)
        : [...prev, address]
    );
  };

  return (
    <div className="w-full">
      <Table className="border border-gray-700 rounded-lg shadow-md">
        <TableHeader className="bg-zinc-800">
          <TableRow>
            {showIndex && <TableHead className="p-3 text-left">序号</TableHead>}
            {tableHeaders.map((header, idx) => (
              <TableHead key={idx} className="p-3 text-left">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={showIndex ? tableHeaders.length + 1 : tableHeaders.length} className="text-center p-4 text-zinc-400">加载中...</TableCell></TableRow>
          ) : participantsList.length === 0 ? (
            <TableRow><TableCell colSpan={showIndex ? tableHeaders.length + 1 : tableHeaders.length} className="text-center p-4 text-zinc-400">暂无参与者</TableCell></TableRow>
          ) : (
            adaptedList.map((participant: any, index: number) => {
              const isExpanded = expandedRows.includes(participant.address);
              return (
                <React.Fragment key={index}>
                  <TableRow className="border-b border-gray-700">
                    {showIndex && <TableCell className="p-3">{index + 1}</TableCell>}
                    <TableCell className="p-3">
                      {showMintHistory ? (
                        <span
                          className="text-blue-500 underline cursor-pointer hover:text-blue-400 select-text"
                          onClick={() => handleToggleRow(participant.address)}
                        >
                          {participant.address}
                        </span>
                      ) : (
                        participant.address
                      )}
                    </TableCell>
                    <TableCell className="p-3">{participant.amount ? `${participant.amount}/${participant.sats}` : '-'}</TableCell>
                  </TableRow>
                  {showMintHistory && isExpanded && (
                    <TableRow>
                      <TableCell colSpan={showIndex ? 3 : 2} className="bg-zinc-800 p-3 text-sm text-zinc-300">
                        <div className="mb-1 font-semibold">Valid Txids:</div>
                        {participant.valid?.MintHistory?.length === 0 || !participant.valid?.MintHistory ? (
                          <div className="text-zinc-400">No Valid MintHistory</div>
                        ) : (
                          <ul className="space-y-1 mb-2">
                            {participant.valid.MintHistory.map((item: any, i: number) => {
                              const txid = item.Utxo?.split(':')[0];
                              const amt = item.Amt;
                              return (
                                <li key={i} className="flex items-center space-x-2">
                                  <a href={generateMempoolUrl({
                                    network: 'testnet',
                                    path: `tx/${txid}`,
                                    chain: Chain.SATNET,
                                    env: 'dev',
                                  })} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                    {txid} <span >({amt})</span>
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div className="mb-1 font-semibold mt-2">Invalid Txids:</div>
                        {participant.invalid?.MintHistory?.length === 0 || !participant.invalid?.MintHistory ? (
                          <div className="text-zinc-400">No Invalid MintHistory</div>
                        ) : (
                          <ul className="space-y-1">
                            {participant.invalid.MintHistory.map((item: any, i: number) => {
                              const txid = item.Utxo?.split(':')[0];
                              const amt = item.RefundValue
                                ;
                              return (
                                <li key={i} className="flex items-center space-x-2">
                                  <a href={generateMempoolUrl({
                                    network: 'testnet',
                                    path: `tx/${txid}`,
                                    chain: Chain.SATNET,
                                    env: 'dev',
                                  })} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                    {txid} <span className="text-zinc-400">({amt})</span>
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
      {onClose && (
        <div className="flex justify-end mt-4">
          <Button variant="outline" className='w-48 h-11 mb-2 mx-4 text-base text-zinc-300' onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default ParticipantsTable; 