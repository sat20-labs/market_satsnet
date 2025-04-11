'use client';

import { getChargedTaskList, getOrderTaskList } from '@/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableColumn,
  Spinner,
  getKeyValue,
  Select,
  SelectItem,
  Tooltip,
} from '@nextui-org/react';
import { Pagination } from '@/components/Pagination';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { hideStr } from '@/lib';
import { generateMempoolUrl } from '@/lib/utils';

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
  const [dataSource, setDataSource] = useState([]);

  const taskTypeList = [
    { label: 'Charged Task', value: '0' },
    { label: 'Order Task', value: '1' },
  ];

  const onSelectionChange = (key: any) => {
    const _k = Number(Array.from(key.values())[0]);
    setSelectKey(_k.toString());
  };

  const getChargedTasks = async () => {
    let tasks = [];

    setLoading(true);
    const resp = await getChargedTaskList({
      address: address,
      offset: (page - 1) * size,
      size: size,
      sort_field: sortField,
      sort_order: sortOrder,
    });

    setLoading(false);
    if (resp.code === 200) {
      tasks = resp.data.tasks;
    }
    setDataSource(tasks);
    setTotal(resp.data.total);
  };

  const getOrderTasks = async () => {
    let tasks = [];

    setLoading(true);
    const resp = await getOrderTaskList({
      address: address,
      offset: (page - 1) * size,
      size: size,
      sort_field: sortField,
      sort_order: sortOrder,
    });

    setLoading(false);
    if (resp.code === 200) {
      tasks = resp.data.tasks;
    }
    setDataSource(tasks);
    setTotal(resp.data.total);
  };

  const toDetail = (e) => {
    const item: any = dataSource.find((v: any) => v?.txid === e);
    // if (item?.type === 'search_rarity_sats' && item?.status === 2){ // status=2为成功
    if (item?.type === 'search_rarity_sats') {
      router.push(`/tools/sat?txid=${e}`);
    }
  };

  const columns = [
    {
      key: 'txid',
      label: 'Tx',
      allowsSorting: true,
    },
    {
      key: 'fees',
      label: 'Fee',
      allowsSorting: true,
    },
    {
      key: 'type',
      label: 'Type',
      allowsSorting: true,
    },
    {
      key: 'created_at',
      label: 'Create Date',
      allowsSorting: true,
    },
    {
      key: 'updated_at',
      label: 'Update Date',
      allowsSorting: true,
    },
    {
      key: 'status',
      label: 'Status',
      allowsSorting: true,
    },
  ];

  useEffect(() => {
    if (selectKey === '0') {
      getChargedTasks();
    } else if (selectKey === '1') {
      getOrderTasks();
    }
  }, [selectKey]);

  return (
    <div className="pt-4">
      <div className="mb-2 flex justify-end items-center">
        <Select
          className="w-48"
          selectionMode="single"
          selectedKeys={selectKey}
          defaultSelectedKeys={['0']}
          onSelectionChange={onSelectionChange}
        >
          {taskTypeList.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </Select>
      </div>
      <Table
        isHeaderSticky
        isStriped
        // sortDescriptor={sortDescriptor}
        // onSortChange={onTableSortChange}
        color="primary"
        selectionMode="single"
        onRowAction={toDetail}
        bottomContent={
          total > 1 ? (
            <div className="flex justify-center">
              <Pagination
                total={total}
                page={page}
                size={size}
                onChange={(offset, size) => {
                  setPage(offset);
                  // setSize(size);
                }}
              />
            </div>
          ) : null
        }
      >
        <TableHeader>
          {columns.map((column) => (
            <TableColumn
              key={column.key}
              // allowsSorting={column.allowsSorting}
              className="text-sm md:text-base font-extralight"
            >
              {column.label}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody
          isLoading={loading}
          items={dataSource}
          emptyContent={'No Data.'}
          loadingContent={<Spinner />}
        >
          {(item: any) => (
            <TableRow
              key={item.txid}
              className="cursor-pointer text-sm md:text-base"
            >
              {(columnKey) => {
                if (columnKey === 'txid') {
                  const txid = item.txid;
                  const href = generateMempoolUrl({
                    network,
                    path: `tx/${txid}`,
                  });

                  return (
                    <TableCell className="font-light text-sm md:text-base">
                      <Tooltip content={txid}>
                        <a
                          className="text-blue-500 cursor-pointer mr-2"
                          href={href}
                          target="_blank"
                        >
                          {hideStr(txid)}
                        </a>
                      </Tooltip>
                      {/* <CopyButton text={t} tooltip="Copy Tick" /> */}
                    </TableCell>
                  );
                } else if (columnKey === 'created_at') {
                  return (
                    <TableCell className="font-light text-sm md:text-base">
                      {new Date(getKeyValue(item, columnKey)).toLocaleString(
                        'af',
                      )}
                    </TableCell>
                  );
                } else if (columnKey === 'updated_at') {
                  return (
                    <TableCell className="font-light text-sm md:text-base">
                      {new Date(getKeyValue(item, columnKey)).toLocaleString(
                        'af',
                      )}
                    </TableCell>
                  );
                } else {
                  return (
                    <TableCell className="font-light text-sm md:text-base">
                      {getKeyValue(item, columnKey)}
                    </TableCell>
                  );
                }
              }}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
