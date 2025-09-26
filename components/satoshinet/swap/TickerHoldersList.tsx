import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHead, TableRow, TableCell, TableBody, TableHeader } from "@/components/ui/table";
import Link from "next/link";
import { CustomPagination } from "@/components/ui/CustomPagination";
import { useCommonStore } from "@/store/common";
import clientApi from "@/api/clientApi";
import { Chain } from "@/types";
import { hideStr } from '@/utils';
import { generateMempoolUrl } from "@/utils/url";

interface TikcerHoldersListProps {
    asset: string;
    tickerInfo: any;
    onTotalChange: (total: number) => void;
}

export function TikcerHoldersList({ asset, onTotalChange, tickerInfo }: TikcerHoldersListProps) {
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

        <div className="w-full mb-4">
            <Table className="w-full">
                <TableHeader>
                    <TableRow className="bg-zinc-800 text-gray-500 text-sm top-0 z-10">
                        <TableHead className="text-left">No.</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-right">Balance&nbsp;&nbsp;</TableHead>
                        <TableHead className="text-center">Percentage</TableHead>
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
                            <TableRow className="h-14 text-sm" key={item.wallet || idx}>
                                <TableCell className="text-left">&nbsp;&nbsp;{(page - 1) * pageSize + idx + 1}</TableCell>
                                <TableCell>
                                    <Link href={generateMempoolUrl({ network: network, path: `address/${item.wallet}`, chain: Chain.SATNET, env: 'dev' })} target="_blank" className="text-gray-400 break-all">
                                        {/* {item.wallet} */}
                                        {hideStr(item.wallet, 4)}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right text-xs text-gray-400">{Number(item.total_balance).toLocaleString()}&nbsp;&nbsp;&nbsp;&nbsp;</TableCell>
                                <TableCell className="text-center ">
                                    {/* {((item.total_balance / totalBalance) * 100).toFixed(2)}% */}
                                    <span className="text-gray-400 text-xs">{parseFloat(((item.total_balance / tickerInfo.maxSupply) * 100).toFixed(5))}%</span>
                                    {/* <div className="text-center w-40 bg-gray-700 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full mb-2"
                                            style={{ width: `${parseFloat(((item.total_balance / tickerInfo.maxSupply) * 100).toFixed(10))}%` }}
                                        ></div>
                                    </div> */}
                                </TableCell>

                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <hr className="mt-2 border-zinc-800" />
            <div className="text-center text-gray-500 bg-zinc-900 py-[0.5px] rounded-sm">
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
            </div>
        </div>
    );
} 