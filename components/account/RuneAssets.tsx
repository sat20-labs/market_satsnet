import { ordx } from '@/api/ordx';
import { useMemo } from 'react';
import { Empty } from 'antd';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import useSWR from 'swr';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Pagination,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  getKeyValue,
} from '@nextui-org/react';
import { useCommonStore } from '@/store';

export const RuneAssets = () => {
  const { address, network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const swrKey = useMemo(() => {
    return `/ordx/getAddressAssetsList-${address}-${chain}-${network}`;
  }, [address, network]);

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    () => ordx.getOrdinalsAssets({ address, network }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const columns = [
    {
      key: 'rune',
      label: 'Rune',
    },
    {
      key: 'balance',
      label: 'Balance',
    },
  ];
  // const rows = [
  //   {
  //     key: '1',
  //     rune: 'RUNE',
  //     balance: '0.00000000',
  //   },
  // ];
  const rows = useMemo<any[]>(() => {
    return (
      data?.runes_balances.map((v, i) => {
        return {
          key: i,
          rune: v[0],
          balance: v[1],
          symbol: v[2],
        };
      }) || []
    );
  }, [data]);
  console.log(rows);

  return rows.length === 0 ? (
    <div className="flex items-center justify-center h-64">
      <Empty />
    </div>
  ) : (
    <Card className="w-full max-w-6xl mx-auto bg-[#1c1917] text-white shadow-none">
      <CardHeader className="pb-0 pt-4 px-4">
        <h4 className="text-xl font-normal">Assets</h4>
      </CardHeader>
      <CardBody className="overflow-visible py-4">
        <Table aria-label="Example table with dynamic content">
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn className="text-lg" key={column.key}>
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={rows}>
            {(item) => {
              return (
                <TableRow key={item.key}>
                  {(columnKey) => {
                    const value = getKeyValue(item, columnKey);
                    console.log('item', item);

                    if (columnKey === 'rune') {
                      return (
                        <TableCell>
                          <div className="flex items-center space-x-4">
                            {/* <div className="bg-orange-500 text-white w-10 h-10 rounded flex items-center justify-center font-bold">
                              UN
                            </div> */}
                            <span className="text-lg">UNCOMMON•GOODS</span>
                          </div>
                        </TableCell>
                      );
                    } else if (columnKey === 'balance') {
                      return (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{value}</span>
                            <span>{item.symbol}</span>
                          </div>
                        </TableCell>
                      );
                    } else {
                      return (
                        <TableCell>
                          <div className="flex items-center space-x-4">
                            <span className="text-lg">{value}</span>
                          </div>
                        </TableCell>
                      );
                    }
                  }}
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
        {/* <div className="space-y-4">
          <div className="flex justify-center">
            <Pagination
              total={1}
              initialPage={1}
              className="gap-2"
              classNames={{
                item: 'bg-transparent text-white hover:bg-gray-700',
                cursor: 'text-white',
              }}
            />
          </div>
        </div> */}
      </CardBody>
    </Card>
  );
};
