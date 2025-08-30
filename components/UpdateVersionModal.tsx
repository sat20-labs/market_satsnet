import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { version } from '@/assets/version';
import { marketApi } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store';

export const UpdateVersionModal = () => {
  const { setAppVersion } = useCommonStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const showModal = () => {
    setOpen(true);
  };

  // Get data from useQuery
  const { data: versionData } = useQuery({
    queryKey: ['version'],
    queryFn: () => fetch('/api/version').then(res => res.json()),
    refetchInterval: 300000, // 增加到5分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
  });

  // Handle side effect in useEffect
  useEffect(() => {
    if (versionData) {
      console.log(versionData);
      if (Number(versionData) > version) {
        showModal();
      }
    }
  }, [versionData]); // Depend on appVersion data

  const timer = useRef<any>(null);

  const refresh = () => {
    setOpen(false);
    window.location.reload();
  };
  const hideModal = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        // checkVersion();
      },
      1000 * 60 * 5,
    );
    setOpen(false);
  };
  useEffect(() => {
    setAppVersion(version);
  }, [setAppVersion]); // Added dependency
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && hideModal()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('pages.app.version_update_title')}</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={hideModal}>
            {t('buttons.talk_later')}
          </Button>
          <Button variant="destructive" onClick={refresh}>
            {t('buttons.update_now')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
