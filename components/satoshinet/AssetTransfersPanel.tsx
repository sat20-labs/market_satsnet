import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHead, TableRow, TableCell, TableBody, TableHeader } from "@/components/ui/table";
import Link from "next/link";
import { CustomPagination } from "@/components/ui/CustomPagination";
import { useCommonStore } from "@/store/common";
import clientApi from "@/api/clientApi";

interface AssetTransfersPanelProps {
  asset: string;
  onTotalChange: (total: number) => void;
}

export function AssetTransfersPanel({ asset, onTotalChange }: AssetTransfersPanelProps) {
  const { network } = useCommonStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalBalance, setTotalBalance] = useState(0); // 新增状态存储总余额
  const PAGE_SIZES = [10, 20, 50, 100];

  const { data: holdersData, isLoading: isHoldersLoading, isError: isHoldersError } = useQuery<any>({
    queryKey: ["ticker", "holders", asset, network, page, pageSize],
    queryFn: () => clientApi.getTickerHolders(asset, page, pageSize),
    enabled: !!asset,
    refetchInterval: 60000, 
    refetchOnWindowFocus: false,
  });
   console.log('holdersData', holdersData);

  const holders = holdersData?.data?.detail || [];
  const total = holdersData?.data?.total || 0;
  // 计算总余额
  useEffect(() => {
    const currentPageBalance = holders.reduce(
      (sum: number, item: any) => sum + parseFloat(item.total_balance || '0'),
      0
    );
    setTotalBalance((prevBalance) => prevBalance + currentPageBalance); // 累加总余额
  }, [holders]);

  const totalPages = Math.ceil(total / pageSize);
  useEffect(() => {
    onTotalChange(total);
  }, [total]);
  return (
    <Tabs defaultValue="holders" className="mt-6">
      <TabsList>
        <TabsTrigger value="holders">Holders</TabsTrigger>
      </TabsList>
      <TabsContent value="holders" className="mt-4">
        <div></div>
        <Table>
          <TableHeader>
            <TableRow className="font-semibold text-lg bg-gray-800">
              <TableHead className="text-left">No.</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-center">Percentage</TableHead>
              <TableHead className="text-right">Balance&nbsp;&nbsp;</TableHead>               
            </TableRow>
            </TableHeader>
          <TableBody>            
            {isHoldersLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : isHoldersError ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-red-500"> Loading error </TableCell>
              </TableRow>
            ) : holders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No Data</TableCell>
              </TableRow>
            ) : (
              holders.map((item: any, idx: number) => (
                <TableRow className="h-14" key={item.wallet || idx}>
                    <TableCell className="text-left">&nbsp;&nbsp;{(page - 1) * pageSize + idx + 1}</TableCell>                  
                  <TableCell>
                    <Link href={`https://mempool.test.sat20.org/testnet/address/${item.wallet}`} target="_blank" className="text-blue-500/80 underline break-all">{item.wallet}</Link>
                  </TableCell>
                  <TableCell className="text-left">
                    {/* {((item.total_balance / totalBalance) * 100).toFixed(2)}% */}
                    <span className="text-gray-400 text-sm">{((item.total_balance / totalBalance) * 100).toFixed(2)}%</span> 
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full mb-2"
                        style={{ width: `${((item.total_balance / totalBalance) * 100).toFixed(2)}%` }}
                      ></div>
                    </div>   
                  </TableCell>
                  <TableCell className="text-right">{item.total_balance}&nbsp;&nbsp;&nbsp;&nbsp;</TableCell>                 
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <hr className="my-4 border-zinc-800" />
        <CustomPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          availablePageSizes={PAGE_SIZES}
          isLoading={isHoldersLoading}
        />
      </TabsContent>
    </Tabs>
  );
} 