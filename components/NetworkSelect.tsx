'use client';

import { useState, useRef } from 'react';
import { useCommonStore } from '@/store';
import type { Network } from '@/store';
import { Icon } from '@iconify/react'; // 引入 Iconify 图标
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { toast } from 'sonner';


export const NetworkSelect = () => {
  const { network, setNetwork } = useCommonStore(); // 假设 store 中有 network 和 setNetwork
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null); // 用于存储关闭菜单的定时器
  const {
    network: walletNetwork,
    connected,
    disconnect,
    switchNetwork,
  } = useReactWalletStore((state) => state);
  const handleMouseEnter = () => {
    if (window.innerWidth > 768) {
      if (closeTimeout.current) {
        clearTimeout(closeTimeout.current); // 清除关闭菜单的定时器
      }
      setIsOpen(true); // 打开菜单
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth > 768) {
      // 延迟关闭菜单
      closeTimeout.current = setTimeout(() => {
        setIsOpen(false);
      }, 300); // 延迟 300 毫秒关闭
    }
  };

  const handleClick = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current); // 清除关闭菜单的定时器
    }
    setIsOpen((prev) => !prev); // 点击时切换菜单状态
  };

  const handleSelectionChange = async (value: Network) => {
    setIsOpen(false); // 选择后关闭菜单
    const _v = value === 'mainnet' ? 'livenet' : 'testnet';
    if (connected && walletNetwork !== _v) {
      try {
        await window.sat20.switchNetwork(_v);
        setNetwork(value); // 更新网络的值
      } catch (error) {
        toast.error('Switch network failed');
      }
    } else {
      setNetwork(value); // 更新网络的值
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 按钮 */}
      <button
        className="flex items-center px-4 py-2 bg-[#181819] text-gray-300 text-xs sm:text-sm rounded-xl"
        onClick={handleClick}
      >
        {network === ('mainnet' as Network) ? 'Mainnet' : 'Testnet'}
        <span className="ml-2">
          {isOpen ? (
            <Icon icon="mdi-light:chevron-up" className="text-gray-400 text-lg" />
          ) : (
            <Icon icon="mdi-light:chevron-down" className="text-gray-400 text-lg" />
          )}
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 py-2 mt-1 w-36 bg-[#272727] shadow-xl rounded-lg z-10"
          onMouseEnter={handleMouseEnter} // 鼠标移到菜单时保持打开
          onMouseLeave={handleMouseLeave} // 鼠标移出菜单时延迟关闭
        >
          <ul>
            <li
              className="px-2 py-1 mx-2 hover:bg-zinc-900 text-gray-400 text-sm sm:text-base cursor-pointer rounded-sm"
              onClick={() => handleSelectionChange('mainnet')}
            >
              Mainnet
            </li>
            <li
              className="px-2 py-1 mx-2 hover:bg-zinc-900 text-gray-400 text-sm sm:text-base cursor-pointer rounded-sm"
              onClick={() => handleSelectionChange('testnet')}
            >
              Testnet
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};