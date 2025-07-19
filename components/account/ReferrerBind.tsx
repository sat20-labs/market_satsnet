'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ReferrerBind = () => {
  const { t } = useTranslation();
  const [referrerName, setReferrerName] = useState('');
  const [serverPubKey, setServerPubKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBind = async () => {
    if (!referrerName || !serverPubKey) {
      toast.error(t('common.please_input_all_fields'));
      return;
    }

    setLoading(true);
    try {
      const result = await window.sat20.bindReferrerForServer(referrerName, serverPubKey);
      if (result) {
        toast.success(t('common.bind_success'));
        setReferrerName('');
        setServerPubKey('');
      }
    } catch (error) {
      console.error('Bind referrer error:', error);
      toast.error(t('common.bind_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">
          {t('common.referrer_name')}
        </label>
        <Input
          value={referrerName}
          onChange={(e) => setReferrerName(e.target.value)}
          placeholder={t('common.input_referrer_name')}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">
          {t('common.server_public_key')}
        </label>
        <Input
          value={serverPubKey}
          onChange={(e) => setServerPubKey(e.target.value)}
          placeholder={t('common.input_server_public_key')}
          disabled={loading}
        />
      </div>

      <Button
        onClick={handleBind}
        disabled={loading || !referrerName || !serverPubKey}
        className="w-full btn-gradient"
      >
        {loading ? t('common.binding') : t('common.bind')}
      </Button>
    </div>
  );
};

export default ReferrerBind; 