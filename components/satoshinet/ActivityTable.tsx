'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Icon } from '@iconify/react';
import { DataTable } from "@/components/satoshinet/DataTable";
import { Activity } from "./types";
import { hideStr }  from '@/utils';
import { useState } from 'react';
import { Copy, ChevronDown, Bitcoin } from 'lucide-react';
import { Button,} from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: Error | null;
}

export const ActivityTable = ({ activities, isLoading, error }: ActivityTableProps) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const copyAddress = (address) => {
    if (address) {
      navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    }
  };
  const columns: ColumnDef<Activity>[] = [
    {
      accessorKey: "eventTypeLabel",
      header: t('common.event'),
      cell: ({ row }) => {
        const activity = row.original;
        const label = activity.eventTypeLabel;
        return <span className="px-2 py-1 rounded text-xs font-semibold">{label}</span>;
      },
    },
    {
      accessorKey: "quantity",
      header: t('common.quantity'),
      cell: ({ row }) => row.original.quantity.toLocaleString(),
    },
    {
      accessorKey: "price",
      header: t('common.unit_price_sats'),
      cell: ({ row }) => {
        const satsPrice = Math.round(row.original.price);
        return satsPrice.toLocaleString() + ' sats';
      },
    },
    {
      accessorKey: "totalValue",
      header: t('common.total_value_sats'),
      cell: ({ row }) => {
        const satsTotalValue = Math.round(row.original.totalValue);
        return satsTotalValue.toLocaleString() + ' sats';
      },
    },
    {
      accessorKey: "from",
      header: t('common.from'),
      cell: ({ row }) => {
        const from = row.original.from || '-';
        return (
        <span className="flex items-center justify-start gap-1">
            <span className="text-zinc-300 font-thin">
              {hideStr(from, 5)}
            </span>
            <Button variant="ghost" size="icon" onClick={() => copyAddress(from)} className="h-6 w-6 text-zinc-400 cursor-pointer">
              <Copy className="h-4 w-4" />
            </Button>        
        </span>);
      },
    },
    {
      accessorKey: "to",
      header: t('common.to'),
      cell: ({ row }) => {
        const to = row.original.to || '-';
        return (
          <span className="flex items-center justify-start gap-1">
              <span className="text-zinc-300 font-thin">
                {hideStr(to, 5)}
              </span>
              <Button variant="ghost" size="icon" onClick={() => copyAddress(to)} className="h-6 w-6 text-zinc-400 cursor-pointer">
                <Copy className="h-4 w-4" />
              </Button>        
        </span>);
      },
    },
    {
      id: "time",
      header: t('common.time'),
      cell: ({ row }) => {
        const activity = row.original;
        return (
          <div className="flex items-center justify-start gap-2">
            {activity.time}
            {activity.txid && (
              <a
                href={`https://mempool.dev.sat20.org/tx/${activity.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('common.view_transaction')}
                className="text-gray-400 hover:text-white"
              >
                <Icon icon="mdi:open-in-new" className="text-base" />
              </a>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="text-center p-10">{t('common.loading_activities')}</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">{t('common.error_loading_activities')}: {error.message}</div>;
  }
  console.log('activities', activities);
  return <DataTable columns={columns} data={activities} />;
}; 