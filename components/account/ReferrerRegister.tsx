'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNsList } from '@/lib/hooks/useNsList';

const ReferrerRegister = () => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: nsList } = useNsList();
  const { names = [] } = nsList || {};

  const handleRegister = async () => {
    if (!name) {
      toast.error(t('common.please_input_name'));
      return;
    }

    setLoading(true);
    try {
      const result = await window.sat20.registerAsReferrer(name, 1);
      if (result) {
        toast.success(t('common.register_success'));
        setName('');
      }
    } catch (error) {
      console.error('Register as referrer error:', error);
      toast.error(t('common.register_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">
          {t('common.referrer_register_name')}
        </label>
        <Select
          value={name}
          onValueChange={setName}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('common.input_referrer_register_name')} />
          </SelectTrigger>
          <SelectContent>
            {names?.map((item) => (
              <SelectItem key={item.id} value={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleRegister}
        disabled={loading || !name}
        className="w-full btn-gradient"
      >
        {loading ? t('common.registering') : t('common.register')}
      </Button>
    </div>
  );
};

export default ReferrerRegister; 