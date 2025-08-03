import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PointsDashboard() {
  return (
    <div className="p-4 mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">SATSWAP Market Points</h1>

      {/* 积分概览 */}
      <Card className="rounded-2xl shadow-xl p-6 bg-white/5 border border-gradient-to-r from-purple-500 to-pink-500">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-zinc-400 text-sm">当前积分余额</p>
            <h2 className="text-3xl font-bold text-white">12,800 <span className='text-zinc-400'>MP</span></h2>
            <p className="text-green-400 text-sm mt-1">+180 本月新增</p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">VIP 等级</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-yellow-500 text-white px-3 py-4 rounded-full text-xs whitespace-nowrap">VIP 3</Badge>
              <Progress value={60} className="w-full bg-zinc-800" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">距离 VIP 4 还差 40% 能量</p>
          </div>
        </CardContent>
      </Card>

      {/* 页面 Tabs */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid grid-cols-3 bg-zinc-800">
          <TabsTrigger value="history">积分记录</TabsTrigger>
          <TabsTrigger value="rewards">获取方式</TabsTrigger>
          <TabsTrigger value="vip">VIP 权益</TabsTrigger>
        </TabsList>

        {/* 积分记录 */}
        <TabsContent value="history" className="mt-4 space-y-2">
          {["交易返利 +60 MP", "质押奖励 +100 MP", "发射池奖励 +20 MP",  "推荐人奖励 +100 MP"].map((text, i) => (
            <Card key={i} className="p-3 text-sm bg-zinc-900 border border-zinc-700">
              {text}
            </Card>
          ))}
        </TabsContent>

        {/* 获取方式 */}
        <TabsContent value="rewards" className="mt-4 space-y-4">
          <Card className="p-4 bg-zinc-900 border border-zinc-700">
            <h3 className="text-lg font-semibold">交易行为</h3>
            <p className="text-sm text-zinc-400 mt-1">每消耗 10 聪手续费 = 1 MP</p>
          </Card>
          
          <Card className="p-4 bg-zinc-900 border border-zinc-700">
            <h3 className="text-lg font-semibold">质押行为</h3>
            <p className="text-sm text-zinc-400 mt-1">每质押 10 万聪，每 10 天获得 1 MP</p>
          </Card>
          
          <Card className="p-4 bg-zinc-900 border border-zinc-700">
            <h3 className="text-lg font-semibold">发射池行为</h3>
            <p className="text-sm text-zinc-400 mt-1">每铸造 10,000 聪获得 1 MP</p>
          </Card>
        </TabsContent>

        {/* VIP 权益 */}
        <TabsContent value="vip" className="mt-4 space-y-4">
          {[1, 2, 3, 4, 5].map((level) => (
            <Card key={level} className="p-4 bg-zinc-900 border border-zinc-700">
              <h3 className="text-lg font-semibold">VIP {level}</h3>
              <ul className="text-sm text-zinc-400 mt-2 list-disc ml-4 space-y-1">
                <li>发射池空投优先权</li>
                <li>手续费折扣</li>
                <li>积分兑换权利</li>
              </ul>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* 手续费支付积分选项 */}
      <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-700">
        <p className="text-sm text-white">使用 MP 积分抵扣交易手续费</p>
        <Button variant="outline" className="text-sm border-zinc-600">启用</Button>
      </div>
    </div>
  );
}
