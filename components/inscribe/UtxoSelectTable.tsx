import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  getKeyValue,
  Snippet,
  Card,
  CardBody,
  Checkbox,
  Radio,
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { hideStr } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Props {
  utxos: any[];
  onChange: (utxo: any) => void;
}
export const UtxoSelectTable = ({ utxos, onChange }: Props) => {
  const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
  const columns = [
    {
      key: 'radio',
      label: '',
    },
    {
      key: 'utxo',
      label: 'UTXO',
    },
    {
      key: 'value',
      label: 'Sats',
    },
    {
      key: 'sats',
      label: 'Rare Sats',
    },
    {
      key: 'offset',
      label: 'Offset',
    },
    {
      key: 'type',
      label: 'Type',
    },
  ];
  const selectChange = () => {
    const utxo = Array.from(selectedKeys.values())?.[0];
    if (utxo) {
      const findUtxo = utxos.find((u) => u.utxo === utxo);
      findUtxo && onChange?.(findUtxo);
    }
  };
  const onSelectionChange = (keys: any) => {
    const utxo = Array.from(selectedKeys.values())?.[0];
    if (utxo) {
      const findUtxo = utxos.find((u) => u.utxo === utxo);
      const firstOffset = findUtxo?.sats?.[0].offset || 0;
      if (firstOffset >= 546) {
        return;
      }
    }
    setSelectedKeys(keys);
  };
  useEffect(() => {
    selectChange();
  }, [selectedKeys]);
  return (
    <Card shadow="none">
      <CardBody>
        <Table
          aria-label="Select Utoxs"
          selectionMode="single"
          color="primary"
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.key}>{column.label}</TableColumn>
            )}
          </TableHeader>
          <TableBody>
            {utxos.map((item) => (
              <TableRow key={item.utxo}>
                {(columnKey) => {
                  const value = getKeyValue(item, columnKey);
                  if (columnKey === 'radio') {
                    return (
                      <TableCell>
                        <Icon
                          icon={
                            selectedKeys.has(item.utxo)
                              ? 'solar:check-circle-bold-duotone'
                              : 'solar:record-line-duotone'
                          }
                          className="text-xl"
                        />
                      </TableCell>
                    );
                  } else if (columnKey === 'utxo') {
                    return (
                      <TableCell>
                        <Snippet
                          codeString={value}
                          className="bg-transparent text-inherit"
                          symbol=""
                          size="lg"
                          variant="flat"
                        >
                          <span className="font-thin">{hideStr(value, 6)}</span>
                        </Snippet>
                      </TableCell>
                    );
                  } else if (columnKey === 'sats') {
                    let size = 0;
                    if (value !== undefined) {
                      size = value.reduce((acc, cur) => {
                        return acc + cur.size;
                      }, 0);
                    }
                    return <TableCell>{size}</TableCell>;
                  } else if (columnKey === 'offset') {
                    let offset = 0;
                    if (item.sats) {
                      offset = item.sats[0].offset;
                    }
                    return <TableCell>{offset}</TableCell>;
                  } else {
                    return <TableCell>{value}</TableCell>;
                  }
                }}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};
