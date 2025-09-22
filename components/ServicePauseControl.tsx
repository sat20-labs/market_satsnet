'use client';

import { useCommonStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Icon } from '@iconify/react';

export function ServicePauseControl() {
  const { isServicePaused, servicePauseMessage, setServicePaused } = useCommonStore();
  const [customMessage, setCustomMessage] = useState(servicePauseMessage);

  const handlePause = () => {
    setServicePaused(true, customMessage);
  };

  const handleResume = () => {
    setServicePaused(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon 
            icon={isServicePaused ? "material-symbols:pause" : "material-symbols:play-arrow"} 
            className="w-5 h-5" 
          />
          服务控制面板
        </CardTitle>
        <CardDescription>
          控制全局服务暂停状态
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-gray-300">暂停消息</label>
          <Input
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="输入暂停消息..."
          />
        </div>
        
        <div className="flex gap-2">
          {!isServicePaused ? (
            <Button 
              onClick={handlePause} 
              variant="destructive"
              className="flex-1"
            >
              <Icon icon="material-symbols:pause" className="w-4 h-4 mr-2" />
              暂停服务
            </Button>
          ) : (
            <Button 
              onClick={handleResume} 
              variant="default"
              className="flex-1"
            >
              <Icon icon="material-symbols:play-arrow" className="w-4 h-4 mr-2" />
              恢复服务
            </Button>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          当前状态: 
          <span className={`ml-1 font-medium ${isServicePaused ? 'text-red-500' : 'text-green-500'}`}>
            {isServicePaused ? '已暂停' : '正常运行'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
