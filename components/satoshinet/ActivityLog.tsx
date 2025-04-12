'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';

interface ActivityLogProps {
  ticker: string | null;
  activityLogData?: { event: string; role: string; quantity: number; price: number; time: string }[];
}

export const ActivityLog = ({ ticker }: ActivityLogProps) => {
  // 模拟数据
  const activities = [
    { event: 'Buy', role: 'Taker', quantity: 2000, price: 0.000440, totalValue: 0.88, time: '10h ago' },
    { event: 'Buy', role: 'Taker', quantity: 50000, price: 0.000589, totalValue: 2.945, time: '10h ago' },
    { event: 'Buy', role: 'Taker', quantity: 100000, price: 0.000580, totalValue: 5.8, time: '11h ago' },
    { event: 'Buy', role: 'Taker', quantity: 200000, price: 0.000570, totalValue: 11.4, time: '11h ago' },
    { event: 'Buy', role: 'Taker', quantity: 300000, price: 0.000560, totalValue: 16.8, time: '11h ago' },
    { event: 'Buy', role: 'Taker', quantity: 5000, price: 0.000990, totalValue: 0.495, time: '19h ago' },
    { event: 'Buy', role: 'Taker', quantity: 100000, price: 0.000560, totalValue: 5.6, time: '1d ago' },
    { event: 'Buy', role: 'Taker', quantity: 50000, price: 0.000588, totalValue: 2.94, time: '1d ago' },
  ];

  const [activeTab, setActiveTab] = useState<'activities' | 'myActivities'>('activities'); // 当前选中的 Tab
  const [filterEvent, setFilterEvent] = useState<string | null>(null); // 事件过滤
  const [filterRole, setFilterRole] = useState<string | null>(null); // 角色过滤

  const handleRefresh = () => {
    console.log('Refreshing activity log...');
    // 在这里实现刷新逻辑
  };

  const filteredActivities = activities.filter((activity) => {
    return (
      (!filterEvent || activity.event === filterEvent) &&
      (!filterRole || activity.role === filterRole)
    );
  });

  return (
    <div className="bg-zinc-900/90 sm:p-6 rounded-lg text-zinc-200 w-full">
      {/* 顶部导航栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 sm:gap-4 mb-4 mt-4">
        {/* Tab 切换 */}
        <div className="flex gap-4 w-full sm:w-auto">
          <button
            className={`text-sm sm:text-base font-medium ${
              activeTab === 'activities' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('activities')}
          >
            Activities
          </button>
          <button
            className={`text-sm sm:text-base font-medium ${
              activeTab === 'myActivities' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('myActivities')}
          >
            My Activities
          </button>
        </div>

        {/* 过滤和刷新按钮 */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 items-center">
          <select
            className="bg-zinc-800 text-gray-400 text-sm rounded-lg px-2 py-1"
            onChange={(e) => setFilterEvent(e.target.value || null)}
          >
            <option value="">Events</option>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>
          <select
            className="bg-zinc-800 text-gray-400 text-sm rounded-lg px-2 py-1"
            onChange={(e) => setFilterRole(e.target.value || null)}
          >
            <option value="">Role</option>
            <option value="Taker">Taker</option>
            <option value="Maker">Maker</option>
          </select>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={handleRefresh}
            aria-label="Refresh"
          >
            <Icon icon="mdi:refresh" className="text-xl" />
          </button>
        </div>
      </div>

      {/* 活动记录表格 */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full text-left whitespace-nowrap">
          <thead>
            <tr className="bg-zinc-800 h-12 text-sm font-medium sm:font-semibold sm:text-base text-zinc-400">
              <th className="pl-2 sticky left-0 bg-zinc-800 px-1">Event</th>
              <th className='px-1'>Role</th>
              <th className='px-1'>Quantity</th>
              <th className='px-1'>Unit Price</th>
              <th className='px-1'>Total Value</th>
              <th className='px-1'>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.map((activity, index) => (
              <tr
                key={index}
                className="border-b h-16 text-xs text-zinc-300 border-zinc-800/50 hover:bg-zinc-900/80 cursor-pointer"
              >
                <td className="pl-2 sticky left-0 bg-zinc-900">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      activity.event === 'Buy' ? 'btn-gradient text-black' : 'bg-red-500 text-black'
                    }`}
                  >
                    {activity.event}
                  </span>
                </td>
                <td className='px-1'>{activity.role}</td>
                <td className='px-1'>{activity.quantity.toLocaleString()}</td>
                <td className='px-1'>
                  {activity.price.toFixed(6)} BTC
                  <br />
                  <span className="text-gray-400 text-xs">${(activity.price * 0.0006).toFixed(4)}</span>
                </td>
                <td className='px-1'>
                  {activity.totalValue.toFixed(2)} BTC
                  <br />
                  <span className="text-gray-400 text-xs">${(activity.totalValue * 0.6).toFixed(2)}</span>
                </td>
                <td className="h-full px-1 text-center align-middle">
                  <div className="flex items-center justify-start gap-2">
                    {activity.time}
                    <Icon icon="mdi:open-in-new" className="text-gray-400 text-base hover:text-white cursor-pointer" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};