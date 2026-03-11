'use client';

import React, { useState, useEffect } from 'react';
import { contractService } from '@/domain/services/contract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AddressItem {
  address: string;
  uid: string;
  referer: string;
  referralCount: number;
  donate: string;
  airdrop: string;
}

export interface AllAddressesResponse {
  total: number;
  start: number;
  data: AddressItem[];
}

interface AllAddressesListProps {
  contractUrl: string;
}

export function AllAddressesList({ contractUrl }: AllAddressesListProps) {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<AllAddressesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageStart, setPageStart] = useState(0);
  const [pageLimit] = useState(20);
  const [searchUid, setSearchUid] = useState('');

  const fetchAllAddresses = async (start: number = 0) => {
    if (!contractUrl) return;

    setLoading(true);
    setError(null);
    try {
      const result = await contractService.getContractAllAddresses(contractUrl, start, pageLimit);
      if (result?.status) {
        const parsedData = JSON.parse(result.status);
        setAddresses(parsedData);
      } else {
        setError(t('common.no_data'));
      }
    } catch (err: any) {
      console.error('Failed to fetch all addresses:', err);
      setError(err.message || t('common.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contractUrl) {
      fetchAllAddresses(pageStart);
    }
  }, [contractUrl, pageStart]);

  const handlePrevPage = () => {
    if (pageStart > 0) {
      setPageStart(Math.max(0, pageStart - pageLimit));
    }
  };

  const handleNextPage = () => {
    if (addresses && pageStart + pageLimit < addresses.total) {
      setPageStart(pageStart + pageLimit);
    }
  };

  const handleSearch = () => {
    if (searchUid.trim()) {
      // 这里可以添加搜索功能
      // 暂时先过滤现有数据
      console.log('Search for UID:', searchUid);
    }
  };

  const filteredData = addresses?.data.filter(item =>
    searchUid ? item.uid.includes(searchUid) || item.address.includes(searchUid) : true
  ) || [];

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="text-center text-amber-500 py-4">
            {error}
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="outline" onClick={() => fetchAllAddresses(pageStart)}>
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">{t('pages.dao.workflow.overview.all_addresses')}</CardTitle>
        <CardDescription className="text-zinc-400">
          {t('pages.dao.workflow.overview.all_addresses_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="flex gap-2">
            <Input
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              placeholder={t('pages.dao.workflow.overview.search_placeholder')}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              {t('common.search')}
            </Button>
          </div>

          {/* 分页信息 */}
          <div className="flex justify-between items-center text-sm text-zinc-400">
            <div>
              {t('pages.dao.workflow.overview.total')}: {addresses?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pageStart === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                {pageStart + 1} - {Math.min(pageStart + pageLimit, addresses?.total || 0)} / {addresses?.total || 0}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!addresses || pageStart + pageLimit >= addresses.total}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 地址表格 */}
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">{t('pages.dao.workflow.overview.address')}</TableHead>
                  <TableHead className="text-zinc-400">UID</TableHead>
                  <TableHead className="text-zinc-400">{t('pages.dao.workflow.overview.referrer')}</TableHead>
                  <TableHead className="text-zinc-400">{t('pages.dao.workflow.overview.referral_count')}</TableHead>
                  <TableHead className="text-zinc-400">{t('pages.dao.workflow.overview.donate')}</TableHead>
                  <TableHead className="text-zinc-400">{t('pages.dao.workflow.overview.airdrop')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <TableRow key={index} className="border-zinc-800">
                      <TableCell className="font-mono text-sm text-white">
                        {item.address.substring(0, 10)}...{item.address.substring(item.address.length - 8)}
                      </TableCell>
                      <TableCell className="font-mono text-white">{item.uid}</TableCell>
                      <TableCell className="font-mono text-white">
                        {item.referer || t('common.none')}
                      </TableCell>
                      <TableCell className="text-white">{item.referralCount}</TableCell>
                      <TableCell className="text-white">{item.donate}</TableCell>
                      <TableCell className="text-white">{item.airdrop}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                      {t('common.no_data')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}