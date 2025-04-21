'use client';

import { getChargedTaskList, getOrderTaskList } from '@/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
  TableCaption,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { generateMempoolUrl, hideStr } from '@/utils';

export const OrdxBillList = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { address, network } = useReactWalletStore((state) => state);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<any>('');
  const [sortOrder, setSortOrder] = useState<any>(1);
  const [selectKey, setSelectKey] = useState('0');
  const [dataSource, setDataSource] = useState<any[]>([]);

  const taskTypeList = [
    { label: 'Charged Task', value: '0' },
    { label: 'Order Task', value: '1' },
  ];

  const onSelectionChange = (value: string) => {
    setSelectKey(value);
  };

  const getChargedTasks = async () => {
    let tasks = [];
    setLoading(true);
    try {
      const resp = await getChargedTaskList({
        address: address,
        offset: (page - 1) * size,
        size: size,
        sort_field: sortField,
        sort_order: sortOrder,
      });
      if (resp.code === 200) {
        tasks = resp.data.tasks || [];
        setTotal(resp.data.total || 0);
      } else {
        setTotal(0);
      }
      setDataSource(tasks);
    } catch (error) {
      console.error("Failed to fetch charged tasks:", error);
      setDataSource([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const getOrderTasks = async () => {
    let tasks = [];
    setLoading(true);
    try {
      const resp = await getOrderTaskList({
        address: address,
        offset: (page - 1) * size,
        size: size,
        sort_field: sortField,
        sort_order: sortOrder,
      });
      if (resp.code === 200) {
        tasks = resp.data.tasks || [];
        setTotal(resp.data.total || 0);
      } else {
        setTotal(0);
      }
      setDataSource(tasks);
    } catch (error) {
      console.error("Failed to fetch order tasks:", error);
      setDataSource([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const toDetail = (txid: string) => {
    const item: any = dataSource.find((v: any) => v?.txid === txid);
    if (item?.type === 'search_rarity_sats') {
      router.push(`/tools/sat?txid=${txid}`);
    }
  };

  const columns = [
    { key: 'txid', label: 'Tx' },
    { key: 'fees', label: 'Fee' },
    { key: 'type', label: 'Type' },
    { key: 'created_at', label: 'Create Date' },
    { key: 'updated_at', label: 'Update Date' },
    { key: 'status', label: 'Status' },
  ];

  useEffect(() => {
    if (!address) return;
    if (selectKey === '0') {
      getChargedTasks();
    } else if (selectKey === '1') {
      getOrderTasks();
    }
  }, [selectKey, page, size, address, sortField, sortOrder]);

  return (
    <TooltipProvider>
      <div className="pt-4 space-y-4">
        <div className="flex justify-end items-center">
          <Select value={selectKey} onValueChange={onSelectionChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select task type" />
            </SelectTrigger>
            <SelectContent>
              {taskTypeList.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className="text-sm md:text-base font-medium">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : dataSource.length > 0 ? (
                dataSource.map((item: any) => (
                  <TableRow
                    key={item.txid}
                    onClick={() => toDetail(item.txid)}
                    className={`${item?.type === 'search_rarity_sats' ? 'cursor-pointer hover:bg-muted/50' : ''} text-sm md:text-base`}
                  >
                    {columns.map((column) => {
                      const cellValue = item[column.key];
                      if (column.key === 'txid') {
                        const href = generateMempoolUrl({
                          network,
                          path: `tx/${cellValue}`,
                        });
                        return (
                          <TableCell key={column.key} className="font-light text-sm md:text-base py-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  className="text-blue-500 hover:underline mr-2"
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {hideStr(cellValue)}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{cellValue}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      } else if (column.key === 'created_at' || column.key === 'updated_at') {
                        return (
                          <TableCell key={column.key} className="font-light text-sm md:text-base py-2">
                            {cellValue ? new Date(cellValue).toLocaleString('af') : '-'}
                          </TableCell>
                        );
                      } else {
                        return (
                          <TableCell key={column.key} className="font-light text-sm md:text-base py-2">
                            {cellValue ?? '-'}
                          </TableCell>
                        );
                      }
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No Data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {total > size && !loading && (
          <div className="flex justify-center pt-4">
            <Pagination
              total={total}
              page={page}
              size={size}
              onChange={(newPage) => {
                setPage(newPage);
              }}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
