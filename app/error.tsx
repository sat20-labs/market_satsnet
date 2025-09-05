'use client' 

import { useEffect, useState } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const [errorType, setErrorType] = useState<'network' | 'wallet' | 'unknown'>('unknown');
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
    
    // 简单错误分类
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      setErrorType('network');
    } else if (message.includes('wallet') || message.includes('sat20')) {
      setErrorType('wallet');
    }
  }, [error])

  const getErrorMessage = () => {
    switch (errorType) {
      case 'network': return '网络连接异常，请检查网络后重试';
      case 'wallet': return '钱包连接异常，请重新连接钱包';
      default: return '出了点问题，再试一次';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4 bg-black text-white">
      <h2 className="text-xl font-semibold mb-4">{getErrorMessage()}</h2>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        重试
      </button>
    </div>
  )
}