'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

interface ClosePoolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  poolName?: string;
  isLoading?: boolean;
}

const ClosePoolDialog: React.FC<ClosePoolDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  poolName,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div 
        className="p-6 w-full sm:w-[600px] max-w-10/12 mx-auto bg-zinc-900 rounded-lg shadow-lg relative"
        data-testid="close-pool-dialog"
      >
      <div className="relative flex justify-between items-center mb-4 gap-4 border-b border-zinc-700 pb-4">
        <h2 className="flex justify-start items-center text-2xl font-bold">
          <Icon icon="lucide:x-circle" className="w-8 h-8 mr-2 text-zinc-400" />
          关闭发射池
        </h2>
        <button
          className="absolute top-0 right-0 text-zinc-400 hover:text-white"
          onClick={onClose}
          disabled={isLoading}
        >
          ✕
        </button>
      </div>

      <div className="mb-6">
        {poolName && (
          <div className="mb-4 text-zinc-300">
            <span className="font-semibold text-zinc-400">发射池名称：</span>
            <span className="text-zinc-100 pl-2">{poolName}</span>
          </div>
        )}
        
        <div className="text-zinc-300 text-base leading-relaxed">
          确认关闭此发射池吗？关闭后资产将自动清退给参与者。
        </div>
      </div>

      <div className="flex justify-start gap-4">
        <Button 
          variant="outline" 
          className="w-40 sm:w-48 h-11 text-zinc-300 text-base btn-gradient" 
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? '处理中...' : '确认'}
        </Button>
        <Button 
          variant="outline" 
          className="w-40 sm:w-48 h-11 text-zinc-300 text-base" 
          onClick={onClose}
          disabled={isLoading}
        >
          取消
        </Button>
      </div>
      </div>
    </div>
  );
};

export default ClosePoolDialog;