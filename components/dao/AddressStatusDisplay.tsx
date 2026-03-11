'use client';

import React, { useState, useEffect } from 'react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { contractService } from '@/domain/services/contract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AddressStatusData {
  ReferrerUID: string;
  UID: string;
  InvokeCount: number;
  DonateAmt: string;
  DonateValue: number;
  AirdropAmt: string;
  ReferralCount: number;
}

export interface ReferralData {
  uid: string;
  amount: string;
}

export interface AddressStatusResponse {
  status: AddressStatusData;
  airdrops: any;
  referrals: ReferralData[];
}

interface AddressStatusDisplayProps {
  contractUrl: string;
}

export function AddressStatusDisplay({ contractUrl }: AddressStatusDisplayProps) {
  const { t } = useTranslation();
  const { address, connected } = useReactWalletStore();
  const [statusData, setStatusData] = useState<AddressStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!statusData) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="text-center text-zinc-500 py-4">
            {t('pages.dao.workflow.register.no_status_data')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">{t('pages.dao.workflow.register.address_status')}</CardTitle>
        <CardDescription className="text-zinc-400">
          {t('pages.dao.workflow.register.address_status_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-zinc-400 text-sm">{t('pages.dao.workflow.register.your_uid')}</div>
              <div className="text-white font-mono text-lg">{statusData.status.UID}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-sm">{t('pages.dao.workflow.register.referrer_uid')}</div>
              <div className="text-white font-mono text-lg">
                {statusData.status.ReferrerUID || t('common.none')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-zinc-400 text-sm">{t('pages.dao.workflow.register.invoke_count')}</div>
              <div className="text-white">{statusData.status.InvokeCount}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-sm">{t('pages.dao.workflow.register.referral_count')}</div>
              <div className="text-white">{statusData.status.ReferralCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-zinc-400 text-sm">{t('pages.dao.workflow.register.donate_amount')}</div>
              <div className="text-white">{statusData.status.DonateAmt}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-sm">{t('pages.dao.workflow.register.donate_value')}</div>
              <div className="text-white">{statusData.status.DonateValue}</div>
            </div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm">{t('pages.dao.workflow.register.airdrop_amount')}</div>
            <div className="text-white">{statusData.status.AirdropAmt}</div>
          </div>

          {/* 推荐列表 */}
          {statusData.referrals && statusData.referrals.length > 0 && (
            <div className="mt-4">
              <div className="text-zinc-400 text-sm mb-2 block">
                {t('pages.dao.workflow.register.referrals_list')} ({statusData.referrals.length})
              </div>
              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">UID</TableHead>
                      <TableHead className="text-zinc-400">{t('pages.dao.workflow.register.airdrop_amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusData.referrals.map((referral, index) => (
                      <TableRow key={index} className="border-zinc-800">
                        <TableCell className="font-mono text-white">{referral.uid}</TableCell>
                        <TableCell className="text-white">{referral.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}