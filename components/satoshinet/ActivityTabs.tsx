import React from 'react';
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

/**
 * 活动标签切换组件
 * @param {Object} props
 * @param {'activities'|'myActivities'} props.activeTab 当前激活的标签
 * @param {(tab: 'activities'|'myActivities') => void} props.onTabChange 标签切换回调
 */
export const ActivityTabs = ({ activeTab, onTabChange }: {
  activeTab: 'activities' | 'myActivities',
  onTabChange: (tab: 'activities' | 'myActivities') => void
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1 w-full sm:w-auto">
      <Button
        variant="ghost"
        className={`text-sm sm:text-base font-medium h-auto px-3 py-1.5 ${activeTab === 'activities'
          ? 'text-blue-500 border-b-2 border-blue-500 rounded-none'
          : 'text-gray-400 border-b-2 border-transparent rounded-none'
        }`}
        onClick={() => onTabChange('activities')}
      >
        {t('common.activity')}
      </Button>
      <Button
        variant="ghost"
        className={`text-sm sm:text-base font-medium h-auto px-3 py-1.5 ${activeTab === 'myActivities'
          ? 'text-blue-500 border-b-2 border-blue-500 rounded-none'
          : 'text-gray-400 border-b-2 border-transparent rounded-none'
        }`}
        onClick={() => onTabChange('myActivities')}
      >
        {t('common.my_activities')}
      </Button>
    </div>
  );
}; 