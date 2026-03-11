'use client';

import React, { useState, useEffect } from 'react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { contractService } from '@/domain/services/contract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ReferralData {
  uid: string;
  amount: string;
}

export interface AddressStatusResponse {
  status: any;
  airdrops: any;
  referrals: ReferralData[];
}

interface AirdropReferralsSelectorProps {
  contractUrl: string;
  selectedUids: string[]; // 从父组件接收选择状态
  onSelectReferrals: (selectedUids: string[]) => void;
}

export function AirdropReferralsSelector({
  contractUrl,
  selectedUids: propSelectedUids, // 从props接收
  onSelectReferrals
}: AirdropReferralsSelectorProps) {
  const { t } = useTranslation();
  const { address, connected } = useReactWalletStore();
  const [statusData, setStatusData] = useState<AddressStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedUids, setLocalSelectedUids] = useState<Set<string>>(new Set(propSelectedUids));
  const [selectAll, setSelectAll] = useState(false);

  const fetchAddressStatus = async () => {
    if (!address || !connected || !contractUrl) {
      setError(t('common.connect_wallet_to_view'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await contractService.getContractStatusByAddress(contractUrl, address);
      if (result) {
        setStatusData(result);
      } else {
        setError(t('pages.dao.workflow.register.no_status_data'));
      }
    } catch (err: any) {
      console.error('Failed to fetch address status:', err);
      setError(err.message || t('common.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && address && contractUrl) {
      fetchAddressStatus();
    }
  }, [connected, address, contractUrl]);

  // 当props变化时更新本地状态
  useEffect(() => {
    setLocalSelectedUids(new Set(propSelectedUids));
    // 更新全选状态
    if (statusData?.referrals) {
      const allUids = statusData.referrals.map(r => r.uid);
      setSelectAll(propSelectedUids.length === allUids.length && allUids.length > 0);
    }
  }, [propSelectedUids, statusData]);

  useEffect(() => {
    const handleClearSelection = () => {
      setLocalSelectedUids(new Set());
      setSelectAll(false);
      onSelectReferrals([]); // 通知父组件
    };

    window.addEventListener('airdrop:clear-selection', handleClearSelection);
    return () => {
      window.removeEventListener('airdrop:clear-selection', handleClearSelection);
    };
  }, [onSelectReferrals]);

  const handleSelectUid = (uid: string) => {
    const newSelected = new Set(localSelectedUids);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setLocalSelectedUids(newSelected);
    onSelectReferrals(Array.from(newSelected)); // 立即通知父组件
  };

  const handleSelectAll = () => {
    if (!statusData?.referrals) return;

    let newSelected: Set<string>;
    if (selectAll) {
      newSelected = new Set();
    } else {
      const allUids = statusData.referrals.map(r => r.uid);
      newSelected = new Set(allUids);
    }

    setLocalSelectedUids(newSelected);
    setSelectAll(!selectAll);
    onSelectReferrals(Array.from(newSelected)); // 立即通知父组件
  };

  const handleAddSelectedToText = () => {
    const uidsText = Array.from(localSelectedUids).join('\n');
    // 这里可以触发一个事件或者通过回调传递给父组件
    // 暂时先输出到控制台
    console.log('Selected UIDs:', uidsText);
    return uidsText;
  };

  if (!connected) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="text-center text-zinc-500 py-4">
            {t('common.connect_wallet_to_view')}
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <Button variant="outline" onClick={fetchAddressStatus}>
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statusData?.referrals || statusData.referrals.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="text-center text-zinc-500 py-4">
            {t('pages.dao.workflow.airdrop.no_referrals')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">{t('pages.dao.workflow.airdrop.referrals_list')}</CardTitle>
        <CardDescription className="text-zinc-400">
          {t('pages.dao.workflow.airdrop.referrals_description')} ({statusData.referrals.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-zinc-400">
              {t('pages.dao.workflow.airdrop.selected_count')}: {localSelectedUids.size}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectAll ? t('pages.dao.workflow.airdrop.deselect_all') : t('pages.dao.workflow.airdrop.select_all')}
              </Button>
              <Button size="sm" onClick={() => {
                const uidsText = handleAddSelectedToText();
                // 这里可以触发一个自定义事件
                const event = new CustomEvent('airdrop:selected-uids', { detail: { uidsText } });
                window.dispatchEvent(event);
              }}>
                {t('pages.dao.workflow.airdrop.add_selected')}
              </Button>
            </div>
          </div>

          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-zinc-400">UID</TableHead>
                  <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop.airdrop_amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusData.referrals.map((referral, index) => (
                  <TableRow key={index} className="border-zinc-800">
                    <TableCell>
                      &nbsp;&nbsp;<Checkbox
                        checked={localSelectedUids.has(referral.uid)}
                        onCheckedChange={() => handleSelectUid(referral.uid)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-white">{referral.uid}</TableCell>
                    <TableCell className="text-white">{referral.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-xs text-zinc-500">
            {t('pages.dao.workflow.airdrop.selection_hint')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}