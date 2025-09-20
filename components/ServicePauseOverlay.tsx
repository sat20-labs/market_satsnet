'use client';

import { useCommonStore } from '@/store';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

export function ServicePauseOverlay() {
  const { isServicePaused, servicePauseMessage } = useCommonStore();
  const { t } = useTranslation();

  if (!isServicePaused) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 max-w-md mx-4 text-center">
        {/* 图标 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
            <Icon 
              icon="material-symbols:maintenance" 
              className="w-8 h-8 text-orange-500" 
            />
          </div>
        </div>
        
        {/* 标题 */}
        <h2 className="text-xl font-semibold text-white mb-3">
          {t('servicePause.title', { defaultValue: '服务维护中' })}
        </h2>
        
        {/* 消息内容 */}
        <p className="text-gray-300 mb-6 leading-relaxed">
          {servicePauseMessage}
        </p>
        
        {/* 提示信息 */}
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Icon icon="material-symbols:info-outline" className="w-4 h-4" />
            <span>
              {t('servicePause.tip', { defaultValue: '维护期间所有操作将被暂停' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
