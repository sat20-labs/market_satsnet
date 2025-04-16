'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Icon } from '@iconify/react';
import { DataTable } from "@/components/satoshinet/DataTable";
import { Activity } from "./types";
import { useTranslation } from 'react-i18next';

interface ActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: Error | null;
}

export const ActivityTable = ({ activities, isLoading, error }: ActivityTableProps) => {
  const { t } = useTranslation();
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
      id: "time",
      header: t('common.time'),
      cell: ({ row }) => {
        const activity = row.original;
        return (
          <div className="flex items-center justify-start gap-2">
            {activity.time}
            {activity.txid && (
              <a
                href={`https://mempool.space/testnet/tx/${activity.txid}`}
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