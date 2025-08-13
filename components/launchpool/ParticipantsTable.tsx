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
import { CustomPagination } from '@/components/ui/CustomPagination';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';
import { marketApi } from '@/api';
import { useQueryClient } from '@tanstack/react-query';

interface ParticipantsTableProps {
  contractURL: string;
  bindingSat: number;
  showIndex?: boolean;
  showMintHistory?: boolean;
  tableHeaders?: string[];
  onClose?: () => void;
}

/**
 * 分页获取参与者数据
 * 优化说明：
 * 1. 使用分页避免一次性加载大量数据
 * 2. 并行获取每个地址的状态信息，提高加载速度
 * 3. 添加错误处理，确保单个地址失败不影响整体
 * 4. 支持多种返回数据格式，提高兼容性
 */
const fetchParticipantsWithPagination = async (
  contractURL: string, 
  bindingSat: number, 
  pageStart: number = 0, 
  pageLimit: number = 20
) => {
  if (!contractURL) return { data: [], total: 0 };
  
  try {
    // 获取分页的地址列表
    const response = await marketApi.getContractAllAddresses(contractURL, pageStart, pageLimit);
    console.log('response', response);

    // 处理返回的数据结构
    let list: any[] = [];
    let total = 0;
    
    if (response?.status) {
      const parsedStatus = JSON.parse(response.status);
      list = parsedStatus?.data || [];
      total = parsedStatus?.total || list.length; // 如果没有total字段，使用当前列表长度
    } else if (Array.isArray(response)) {
      // 如果直接返回数组
      list = response;
      total = response.length;
    } else if (response?.data) {
      // 如果返回的是 { data: [], total: number } 格式
      list = response.data || [];
      total = response.total || list.length;
    }
    
    console.log('list', list);
    console.log('total', total);
    
    if (list.length === 0) {
      return { data: [], total: 0 };
    }
    
    // 并行获取每个地址的状态，避免串行等待
    const statusPromises = list.map(async (item: any) => {
      try {
        const statusResponse = await marketApi.getContractStatusByAddress(contractURL, item.address);
        const statusData = statusResponse?.status ? JSON.parse(statusResponse.status) : statusResponse;
        
        return {
          ...item,
          ...statusData
        };
      } catch (error) {
        console.error(`Failed to get status for address ${item.address}:`, error);
        return {
          ...item,
          valid: null,
          invalid: null
        };
      }
    });

    const resultStatusList = await Promise.all(statusPromises);
    
    // 按地址排序
    resultStatusList.sort((a, b) => (a.address > b.address ? 1 : -1));
    
    // 处理数据并计算数量
    const processedData = resultStatusList.map(v => {
      const totalMint = v.valid?.TotalMint;
      let amount = 0;
      if (totalMint?.Value !== undefined && totalMint?.Precision !== undefined) {
        amount = totalMint.Value / Math.pow(10, totalMint.Precision);
      }
      
      return {
        ...v,
        amount: amount,
        sats: Math.floor((amount + bindingSat - 1) / bindingSat),
      };
    });

    return {
      data: processedData,
      total: total
    };
  } catch (e) {
    console.error('Error fetching participants:', e);
    return { data: [], total: 0 };
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
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const availablePageSizes = [10, 20, 50, 100];

  // 计算分页参数
  const pageStart = (currentPage - 1) * pageSize;
  const pageLimit = pageSize;

  // 使用分页查询
  const { data: participantsData, isLoading, error } = useQuery({
    queryKey: ['participants', contractURL, bindingSat, currentPage, pageSize],
    queryFn: () => fetchParticipantsWithPagination(contractURL, bindingSat, pageStart, pageLimit),
    enabled: !!contractURL,
    staleTime: 30000, // 30秒内不重新获取
    retry: 2, // 失败时重试2次
    retryDelay: 1000, // 重试间隔1秒
  });

  const participantsList = participantsData?.data || [];
  const totalItems = participantsData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const queryClient = useQueryClient();

  console.log('participantsList', participantsList);
  console.log('totalItems', totalItems);
  console.log('totalPages', totalPages);

  // 处理分页变化
  const handlePageChange = (page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrentPage(1); // 重置到第一页
    }
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['participants', contractURL, bindingSat, currentPage, pageSize] });
  };

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
            <>
              {/* 骨架屏加载效果 */}
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, index) => (
                <TableRow key={`loading-${index}`} className="border-b border-gray-700">
                  {showIndex && (
                    <TableCell className="p-3">
                      <div className="h-4 bg-zinc-700 rounded animate-pulse"></div>
                    </TableCell>
                  )}
                  <TableCell className="p-3">
                    <div className="h-4 bg-zinc-700 rounded animate-pulse w-32"></div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="h-4 bg-zinc-700 rounded animate-pulse w-20"></div>
                  </TableCell>
                </TableRow>
              ))}
            </>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={showIndex ? tableHeaders.length + 1 : tableHeaders.length} className="text-center p-4">
                <div className="text-red-400 mb-2">加载失败，请稍后重试</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="text-xs"
                >
                  重新加载
                </Button>
              </TableCell>
            </TableRow>
          ) : participantsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showIndex ? tableHeaders.length + 1 : tableHeaders.length} className="text-center p-4 text-zinc-400">
                暂无参与者
              </TableCell>
            </TableRow>
          ) : (
            participantsList.map((participant: any, index: number) => {
              const isExpanded = expandedRows.includes(participant.address);
              const displayIndex = showIndex ? pageStart + index + 1 : null;
              
              return (
                <React.Fragment key={`${participant.address}-${currentPage}-${index}`}>
                  <TableRow className="border-b border-gray-700">
                    {showIndex && <TableCell className="p-3">{displayIndex}</TableCell>}
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
                    <TableCell className="p-3">
                      {participant.amount ? `${participant.amount}/${participant.sats}` : '-'}
                    </TableCell>
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
                              const txid = item.InUtxo?.split(':')[0];
                              const amt = item.InValue;
                              return (
                                <li key={i} className="flex items-center space-x-2">
                                  <a 
                                    href={generateMempoolUrl({
                                      network: 'testnet',
                                      path: `tx/${txid}`,
                                      chain: Chain.SATNET,
                                      env: 'dev',
                                    })} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-500 underline"
                                  >
                                    {txid} <span>({amt})</span>
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
                              const txid = item.InUtxo?.split(':')[0];
                              const amt = item.RemainingValue;
                              return (
                                <li key={i} className="flex items-center space-x-2">
                                  <a 
                                    href={generateMempoolUrl({
                                      network: 'testnet',
                                      path: `tx/${txid}`,
                                      chain: Chain.SATNET,
                                      env: 'dev',
                                    })} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-500 underline"
                                  >
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

      {/* 分页组件 */}
      {totalPages > 1 && (
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          availablePageSizes={availablePageSizes}
          isLoading={isLoading}
        />
      )}

      {/* 总数显示 */}
      {totalItems > 0 && (
        <div className="text-sm text-zinc-400 mt-2 text-center">
          共 {totalItems} 个参与者
        </div>
      )}

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