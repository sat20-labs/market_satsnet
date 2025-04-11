import { useMemo, useEffect } from 'react';
import { useOrderStore, OrderItemType } from '@/store';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  getKeyValue,
} from '@nextui-org/react';
import type { ColumnsType } from 'antd/es/table';
import { hideStr } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { inscribeOrderHistory } from '@/lib/storage';
import localforage from 'localforage';

interface LocalOrderListProps {
  onOrderClick?: (item: OrderItemType) => void;
}
interface DataType {
  orderId: string;
  status: string;
  created: number;
}
export const LocalOrderList = ({ onOrderClick }: LocalOrderListProps) => {
  const { t } = useTranslation();
  const { list, checkAllList, addLocalOrders } = useOrderStore(
    (state) => state,
  );
  const clickHandler = ({ orderId }) => {
    const item = list.find((v) => v.orderId === orderId);
    if (item) {
      onOrderClick?.(item);
    }
  };
  const columns: ColumnsType<DataType> = [
    {
      title: t('pages.inscribe.order.id'),
      dataIndex: 'orderId',
      key: 'orderId',
      render: (_, { orderId }) => {
        return hideStr(orderId, 10);
      },
    },
    {
      title: t('pages.inscribe.order.status'),
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: t('pages.inscribe.order.created'),
      dataIndex: 'created',
      key: 'created',
      render: (_, { created }) => {
        return new Date(created).toLocaleString('af');
      },
    },
  ];

  const dataSource: DataType[] = useMemo(
    () =>
      list.map((item) => ({
        orderId: item.orderId,
        status: item.status,
        created: item.createAt,
      })),
    [list],
  );
  const onRowAction = (k: any) => {
    const item = dataSource.find((v) => v.orderId === k);
    item && clickHandler(item);
  };
  const getHistoryList = async () => {
    let historyList = await inscribeOrderHistory.getList();
    const orderStoreData = (await localforage.getItem('order-store')) as string;
    if (orderStoreData) {
      const orderStoreState = JSON.parse(orderStoreData);
      const localOrderList = orderStoreState.state?.list;
      if (localOrderList?.length) {
        historyList = historyList.concat(localOrderList);
      }
    }
    const len = historyList.length;
    const newList: any[] = [];
    for (let i = 0; i < len; i++) {
      const item = historyList[i];
      const dis = Date.now() - item.createAt;
      if (
        ['pending', 'inscribe_success', 'timeout'].includes(item.status) &&
        dis > 1000 * 60 * 60 * 24 * 7
      ) {
        console.log('超时订单', item.orderId);
        // continue;
      }
      if (item.status === 'pending' && dis > 1000 * 60 * 5) {
        item.status = 'timeout';
        // item.inscription = {};
        // item.files = [];
      }
      newList.push(item);
    }
    addLocalOrders(newList);
    await inscribeOrderHistory.setList(newList);
  };
  useEffect(() => {
    // setTimeout(() => {
    //   const orderStoreData = localStorage.getItem('order-store');

    //   if (orderStoreData) {
    //     const orderStoreState = JSON.parse(orderStoreData);
    //     const localOrderList = orderStoreState.state?.list;
    //     if (localOrderList?.length) {
    //       console.log('localOrderList', localOrderList);

    //       addLocalOrders(localOrderList);
    //     }
    //   }
    // }, 1000);
    getHistoryList();
  }, []);

  return (
    // <Table
    //   columns={columns}
    //   dataSource={dataSource}
    //   pagination={{
    //     position: ['bottomCenter'],
    //   }}
    //   onRow={(record) => {
    //     return {
    //       onClick: () => clickHandler(record), // 点击行
    //     };
    //   }}
    // />
    <Table
      aria-label="Example table with dynamic content"
      onRowAction={onRowAction}
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.key}</TableColumn>}
      </TableHeader>
      <TableBody items={dataSource}>
        {(item) => (
          <TableRow key={item.orderId}>
            {(columnKey) => {
              if (columnKey === 'orderId') {
                return (
                  <TableCell>
                    {hideStr(getKeyValue(item, columnKey), 10)}
                  </TableCell>
                );
              } else if (columnKey === 'created') {
                return (
                  <TableCell>
                    {new Date(getKeyValue(item, columnKey)).toLocaleString(
                      'af',
                    )}
                  </TableCell>
                );
              } else {
                return <TableCell>{getKeyValue(item, columnKey)}</TableCell>;
              }
            }}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
