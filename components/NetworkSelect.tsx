// 'use client';

// import { useCommonStore } from '@/store';
// import { Icon } from '@iconify/react'; // 引入 Iconify 图标
// import { green, orange } from '@mui/material/colors';
// import { useState as reactUseState } from 'react';

// const tabs = [
//     { name: 'MainNet', value: 'mainnet', icon: 'bitcoin-icons:bitcoin-circle-filled', color: orange[500] }, // 使用 Material-UI 的颜色
//     { name: 'TestNet', value: 'testnet', icon: 'bitcoin-icons:bitcoin-circle-filled', color: green[500] }, // 使用 Material-UI 的颜色
//   ];

// export default function CardTabs() {
//   const [activeTab, setActiveTab] = reactUseState('mainnet');

//   return (
//     <div className="w-full">
//       {/* Tabs Header */}
//       <div className="flex bg-black p-2 rounded-lg">
//         {tabs.map((tab, index) => (
//           <button
//             key={tab.value}
//             onClick={() => setActiveTab(tab.value)}
//             className={`flex items-center gap-[2px] px-2 py-2 text-sm border ${
//               activeTab === tab.value
//                 ? 'bg-purple-500/60 text-white border-purple-500/60'
//                 : 'bg-gray-800 text-gray-400 border-purple-500/60 hover:bg-gray-600 hover:text-white'
//             } ${
//               index === 0
//                 ? 'rounded-l-lg' // 左侧按钮圆角
//                 : index === tabs.length - 1
//                 ? 'rounded-r-lg' // 右侧按钮圆角
//                 : '' // 中间按钮无圆角
//             }`}
//           >
//             <Icon
//               icon={tab.icon}
//               className="text-xl"
//               style={{ color: tab.color }} // 动态设置图标颜色
//             />
//             {tab.name}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

'use client';

import { useState, useRef } from 'react';
import { useCommonStore } from '@/store';
import type { Network } from '@/store'; 
import { Icon } from '@iconify/react'; // 引入 Iconify 图标

export const NetworkSelect = () => {
  const { network, changeNetwork } = useCommonStore(); // 假设 store 中有 network 和 setNetwork
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

  const handleSelectionChange = (value: Network) => {
      changeNetwork(value); // 更新网络的值
      setIsOpen(false); // 选择后关闭菜单
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
        {network === ('MainNet' as Network) ? 'MainNet' : 'TestNet'}
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
              onClick={() => handleSelectionChange('MainNet')}
            >
              MainNet
            </li>
            <li
              className="px-2 py-2 hover:bg-gray-700/50 text-gray-400 text-sm sm:text-base cursor-pointer rounded-b-xl"
              onClick={() => handleSelectionChange('TestNet')}
            >
              TestNet
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};