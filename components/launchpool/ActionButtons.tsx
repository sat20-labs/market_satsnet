'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PoolStatus } from '@/types/launchpool';
import { useCommonStore } from '@/store/common';
import { WalletConnectBus } from '../wallet/WalletConnectBus';
import { useTranslation } from 'react-i18next';

const ActionButtons = ({ pool, openModal }: { pool: any; openModal: (type: string, pool: any) => void }) => {
  const { t } = useTranslation(); // Specify the namespace
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 控制菜单显示状态
  const moreActions: React.ReactNode[] = [];
  let mainAction: React.ReactNode = null;

  switch (pool.poolStatus) {
    case PoolStatus.NOT_STARTED:
      mainAction = null;
      break;

    case PoolStatus.ACTIVE:
      mainAction = (
        <WalletConnectBus asChild>
          <Button variant="outline" className="btn-gradient w-36 text-base text-zinc-400" onClick={() => openModal('join', pool)}>
            {t('pages.launchpool.join_pool')}
          </Button>
        </WalletConnectBus>
      );
      break;

    case PoolStatus.FULL:
      mainAction = (
        <Button variant="outline" className="btn-gradient w-36 text-zinc-400" onClick={() => openModal('distribute', pool)}>
          {t('pages.launchpool.start_distribution')}
        </Button>
      );
      break;

    case PoolStatus.DISTRIBUTING:
      mainAction = (
        <Button variant="outline" className="btn-gradient w-36 text-zinc-400" onClick={() => openModal('distribution', pool)}>
          {t('pages.launchpool.view_distribution')}
        </Button>
      );
      moreActions.push(
        <Button variant="outline" className="w-36 text-zinc-400" key="continue" onClick={() => openModal('distribute', pool)}>
          {t('pages.llaunchpool.continue')}
        </Button>
      );
      break;

    case PoolStatus.CLOSED:
    case PoolStatus.COMPLETED:
      mainAction = (
        <Button variant="outline" className="w-36 text-zinc-400" onClick={() => openModal('distribution', pool)}>
          {t('pages.launchpool.view_distribution')}
        </Button>
      );
      break;

    case PoolStatus.EXPIRED:
    case PoolStatus.EXPIRED_UNFILLED:
      mainAction = null;
      moreActions.push(
        <Button variant="outline" className="w-36 text-zinc-400" key="force" onClick={() => openModal('autoDistribute', pool)}>
          {t('pages.launchpool.force_distribution')}
        </Button>,
        <Button variant="outline" className="w-36 text-zinc-400" key="refund" onClick={() => openModal('autoRefund', pool)}>
          {t('pages.launchpool.auto_refund')}
        </Button>
      );
      break;

    default:
      break;
  }

  return (
    <div className="flex items-center gap-2 relative">
      {mainAction}
      {moreActions.length > 0 && (
        <div className="relative">
          <Button
            variant="outline"
            className="w-9 h-9 flex items-center justify-center text-zinc-400"
            onClick={() => setIsMenuOpen(!isMenuOpen)} // 切换菜单显示状态
          >
            ···
          </Button>
          {isMenuOpen && ( // 仅在菜单打开时渲染内容
            <div
              className="absolute right-0 mt-2 w-48 bg-zinc-800 rounded-lg shadow-lg z-50"
              style={{ position: 'fixed', top: 'auto', left: 'auto' }} // 使用 fixed 定位
            >
              {moreActions.map((action, index) => (
                <div key={index} className="p-2 hover:bg-zinc-700">
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionButtons;
