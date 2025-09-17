import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store/common';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';
import { hideStr } from '@/utils';
import clientApi from '@/api/clientApi';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';

interface LptHoldersListProps {
  asset: string;
  ticker: string;
  contractUrl: string;
  tickerInfo?: any;
  refresh: () => void;
  isRefreshing: boolean;
}

interface LptHolderItem {
  Address: string;
  LptAmt: {
    Precision: number;
    Value: number;
  };
  actualLptValue?: number;
  percentage?: number;
}

interface LptHoldersResponse {
  code: number;
  msg: string;
  status: string; // JSON string
}

const LptHoldersList: React.FC<LptHoldersListProps> = ({
  asset,
  ticker,
  contractUrl,
  tickerInfo,
  refresh,
  isRefreshing
}) => {
  const { t } = useTranslation();
  const { network } = useCommonStore();
  
  // 获取LPT持有人数据
  const { data: holdersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['lpt-holders', contractUrl, network],
    queryFn: () => clientApi.getLptHolders(contractUrl),
    enabled: !!contractUrl,
    refetchInterval: 120000, // 2分钟刷新一次
    refetchOnWindowFocus: false,
  });
  console.log('holdersData', holdersData);
  
  const holders: LptHolderItem[] = useMemo(() => {
    if (!holdersData?.status) return [];
    
    try {
      const statusData = JSON.parse(holdersData.status);
      const holdersList = statusData.data || [];
      const totalLptAmt = statusData.totalLptAmt?.Value || 0;
      const totalLptPrecision = statusData.totalLptAmt?.Precision || 0;
      
      const processedHolders = holdersList.map((item: any) => {
        const lptValue = item.LptAmt?.Value || 0;
        const lptPrecision = item.LptAmt?.Precision || 0;
        const actualLptValue = lptValue / Math.pow(10, lptPrecision);
        const actualTotalLpt = totalLptAmt / Math.pow(10, totalLptPrecision);
        
        return {
          ...item,
          actualLptValue,
          percentage: actualTotalLpt > 0 ? parseFloat(((actualLptValue / actualTotalLpt) * 100).toFixed(4)) : 0
        };
      });
      
      // 按LPT持有数量降序排序
      return processedHolders.sort((a, b) => b.actualLptValue - a.actualLptValue);
    } catch (error) {
      console.error('Error parsing LPT holders data:', error);
      return [];
    }
  }, [holdersData]);
  console.log('holders', holders);
  const totalLptInfo = useMemo(() => {
    if (!holdersData?.status) return { total: 0, totalLptAmt: 0 };
    
    try {
      const statusData = JSON.parse(holdersData.status);
      const totalLptAmt = statusData.totalLptAmt?.Value || 0;
      const totalLptPrecision = statusData.totalLptAmt?.Precision || 0;
      const actualTotalLpt = totalLptAmt / Math.pow(10, totalLptPrecision);
      
      return {
        total: statusData.total || 0,
        totalLptAmt: actualTotalLpt
      };
    } catch (error) {
      return { total: 0, totalLptAmt: 0 };
    }
  }, [holdersData]);

  const handleRefresh = () => {
    refetch();
    refresh();
  };

  return (
    <div className="w-full mt-6">
      <div className="bg-zinc-900 rounded-xl shadow-lg shadow-sky-500/50 border border-zinc-700">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-white">
              {t('common.lptHolders')} ({totalLptInfo.total.toLocaleString()})
            </h3>
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
              {ticker}
            </span>
          </div>
          <ButtonRefresh
            onRefresh={handleRefresh}
            loading={isRefreshing || isLoading}
            className="bg-zinc-800/50"
          />
        </div>

        {/* Content with fixed height and scroll */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-zinc-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm">Loading holders...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-red-400">
                <p className="text-sm">Failed to load holders</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : holders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-zinc-400">
                <p className="text-sm">No LPT holders found</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-700">
              {holders.map((holder, index) => (
                <div key={holder.Address} className="p-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-zinc-400 font-mono min-w-0">
                          #{index + 1}
                        </span>
                        <a
                          href={generateMempoolUrl({ 
                            network: network, 
                            path: `address/${holder.Address}`, 
                            chain: Chain.SATNET, 
                            env: 'dev' 
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline font-mono text-sm break-all"
                        >
                          {hideStr(holder.Address, 8)}
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-right">
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          {(holder.actualLptValue || 0).toLocaleString()} LPT
                        </div>
                        <div className="text-xs text-zinc-400">
                          {holder.percentage?.toFixed(4)}%
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-16 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${Math.min(holder.percentage || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total LPT Info */}
        {totalLptInfo.totalLptAmt > 0 && (
          <div className="p-4 border-t border-zinc-700">
            <div className="text-sm text-zinc-400 text-center">
              Total LPT Supply: {totalLptInfo.totalLptAmt.toLocaleString()} LPT
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LptHoldersList;
