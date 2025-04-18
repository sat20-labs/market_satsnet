'use client';
import { useState, useRef } from 'react';
import { useCommonStore } from '@/store';
import { Icon } from '@iconify/react'; 

import type { Chain } from '@/store';

export const ChainSelect = () => {
  const { chain, setChain } = useCommonStore();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null); // 用于存储关闭菜单的定时器

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

  const handleSelectionChange = (value: Chain) => {
    if (value === 'Bitcoin') {
      // Redirect to the external URL for Bitcoin
      window.location.href = 'https://test.ordx.market/';
      // No need to set state or close the menu as we are navigating away
    } else {
      // For other chains (like SatoshiNet), update the state and close the menu
      setChain(value);
      setIsOpen(false); 
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
        className="flex items-center px-4 py-2 bg-[#181819] text-gray-300 text-sm sm:text-base rounded-xl"
        onClick={handleClick}
      >
        {chain === 'Bitcoin' ? 'Bitcoin' : 'SatoshiNet'}
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
          className="absolute top-full left-0 mt-1 w-36 bg-[#272727] shadow-xl rounded-xl z-10"
          onMouseEnter={handleMouseEnter} // 鼠标移到菜单时保持打开
          onMouseLeave={handleMouseLeave} // 鼠标移出菜单时延迟关闭
        >
          <ul>
            <li
              className="px-2 py-2 hover:bg-gray-700/50 text-gray-400 text-sm sm:text-base cursor-pointer rounded-t-xl"
              onClick={() => handleSelectionChange('Bitcoin')}
            >
              Bitcoin
            </li>
            <li
              className="px-2 py-2 hover:bg-gray-700/50 text-gray-400 text-sm sm:text-base cursor-pointer rounded-b-xl"
              onClick={() => handleSelectionChange('SatoshiNet')}
            >
              SatoshiNet
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};