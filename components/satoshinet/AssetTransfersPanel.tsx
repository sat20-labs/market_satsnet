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
  const PAGE_SIZES = [10, 20, 50, 100];

  const { data: holdersData, isLoading: isHoldersLoading, isError: isHoldersError } = useQuery<any>({
    queryKey: ["ticker", "holders", asset, network, page, pageSize],
    queryFn: () => clientApi.getTickerHolders(asset, page, pageSize),
    enabled: !!asset,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });
  // console.log('holdersData', holdersData);

  const holders = holdersData?.data?.detail || [];
  const total = holdersData?.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  useEffect(() => {
    onTotalChange(total);
  }, [total]);
  return (
    <Tabs defaultValue="holders" className="mt-6">
      <TabsList>
        <TabsTrigger value="holders">Holders</TabsTrigger>
      </TabsList>
      <TabsContent value="holders">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>钱包地址</TableHead>
              <TableHead>余额</TableHead>
            </TableRow>
            </TableHeader>
          <TableBody>
            {isHoldersLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : isHoldersError ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-red-500">加载失败</TableCell>
              </TableRow>
            ) : holders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
              </TableRow>
            ) : (
              holders.map((item: any, idx: number) => (
                <TableRow key={item.wallet || idx}>
                  <TableCell>
                    <Link href={`https://mempool.space/address/${item.wallet}`} target="_blank" className="text-blue-400 underline break-all">{item.wallet}</Link>
                  </TableCell>
                  <TableCell>{item.total_balance}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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