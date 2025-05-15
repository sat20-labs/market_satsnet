'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PoolStatus } from '@/types/launchpool';

const ActionButtons = ({ pool, openModal }: { pool: any; openModal: (type: string, pool: any) => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 控制菜单显示状态
  const moreActions: React.ReactNode[] = [];
  let mainAction: React.ReactNode = null;

  switch (pool.status) {
    case PoolStatus.NOT_STARTED:
      mainAction = (
        <Button variant="outline" className='w-36' onClick={() => openModal('details', pool)}>
          Details
        </Button>
      );
      break;

    case PoolStatus.ACTIVE:
      mainAction = (
        <Button variant="outline" className="btn-gradient w-36" onClick={() => openModal('join', pool)}>
          Join Pool
        </Button>
      );
      moreActions.push(
        <Button variant="outline" className='w-36' key="details" onClick={() => openModal('details', pool)}>
          Details
        </Button>
      );
      break;

    case PoolStatus.FULL:
      mainAction = (
        <Button variant="outline" className="btn-gradient w-36" onClick={() => openModal('distribute', pool)}>
          Start Distribution
        </Button>
      );
      moreActions.push(
        <Button variant="outline" className='w-36' key="details" onClick={() => openModal('details', pool)}>
          Details
        </Button>
      );
      break;

    case PoolStatus.DISTRIBUTING:
      mainAction = (
        <Button variant="outline" className="btn-gradient w-36" onClick={() => openModal('distribution', pool)}>
          View Distribution
        </Button>
      );
      moreActions.push(
        <Button variant="outline" className='w-36' key="continue" onClick={() => openModal('distribute', pool)}>
          Continue
        </Button>
      );
      break;

    case PoolStatus.COMPLETED:
      mainAction = (
        <Button variant="outline" className='w-36' onClick={() => openModal('distribution', pool)}>
          View Distribution
        </Button>
      );
      break;

    case PoolStatus.EXPIRED:
    case PoolStatus.EXPIRED_UNFILLED:
      mainAction = (
        <Button variant="outline" className='w-36' onClick={() => openModal('details', pool)}>
          Details
        </Button>
      );
      moreActions.push(
        <Button variant="outline" className='w-36' key="force" onClick={() => openModal('autoDistribute', pool)}>
          Force Distribution
        </Button>,
        <Button variant="outline" className='w-36' key="refund" onClick={() => openModal('autoRefund', pool)}>
          Auto Refund
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
            className="w-9 h-9 flex items-center justify-center"
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
