'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useCommonStore } from '@/store';
import { marketApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/satoshinet/DataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from 'react-i18next';

// --- Define API Response Types ---
interface AssetDetails {
  assets_name: {
    Protocol: string;
    Type: string;
    Ticker: string;
  };
  content_type: string;
  delegate: string;
  amount: string; // Needs conversion to number
  unit_price: string; // Needs conversion to number and currency check
  unit_amount: number;
}

interface Order {
  order_id: number;
  address: string; // Maker address
  order_type: number; // e.g., 1 for Sell listing?
  currency: 'SAT' | 'BTC';
  price: number; // Total order price (in currency unit)
  utxo: string;
  value: number; // satoshis value in utxo?
  assets: AssetDetails;
  order_time: number; // Timestamp ms
  result: number;
  txaddress: string; // Taker address (if filled)
  txid: string; // Transaction ID (if filled)
  txprice: number; // Filled price (total)
  txtime: number; // Transaction timestamp ms (if filled)
  sourcename: string;
}

interface HistoryData {
  total: number;
  offset: number;
  order_list: Order[];
}

interface ApiResponse {
  code: number;
  msg: string;
  data: HistoryData;
}

// --- Component Props ---
interface ActivityLogProps {
  assets_name: string | null;
  // activityLogData prop is likely no longer needed if fetching internally
}

// --- Target Activity Structure ---
interface Activity {
  order_id: number;
  eventTypeLabel: string; // New field for display label matching filter
  quantity: number;
  price: number; // Unit price in BTC
  totalValue: number; // Total value in BTC
  time: string; // Relative time string
  txid?: string; // Optional txid for linking
}

// --- Column Definitions for DataTable ---
const columns: ColumnDef<Activity>[] = [
  {
    accessorKey: "eventTypeLabel",
    header: "Event",
    cell: ({ row }) => {
      const activity = row.original;
      const label = activity.eventTypeLabel;
      let className = "px-2 py-1 rounded text-xs font-semibold";
      return <span className={className}>{label}</span>;
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => row.original.quantity.toLocaleString(),
  },
  {
    accessorKey: "price",
    header: "Unit Price (BTC)",
    cell: ({ row }) => row.original.price.toFixed(8),
  },
  {
    accessorKey: "totalValue",
    header: "Total Value (BTC)",
    cell: ({ row }) => row.original.totalValue.toFixed(8),
  },
  {
    id: "time",
    header: "Time",
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
              aria-label="View transaction"
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

export const ActivityLog = ({ assets_name }: ActivityLogProps) => {
  const { t, i18n } = useTranslation();
  const { chain } = useCommonStore();
  const { address } = useReactWalletStore();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [sort, setSort] = useState(0);
  const [apiFilter, setApiFilter] = useState<number>(0);

  // Dynamic filter list based on address and translation (used for mapping labels)
  const filterList = useMemo(() => {
    const _list = [
      { label: t('common.filter_all'), value: 0 },
      { label: t('common.executed'), value: 1 },
      { label: t('common.delist'), value: 2 },
      { label: t('common.invalid'), value: 3 },
      { label: t('common.list'), value: 4 },
    ];
    if (address) {
      const executedIndex = _list.findIndex(item => item.value === 1);
      if (executedIndex > -1) {
        _list.splice(executedIndex, 1);
      }
      _list.push({ label: t('common.history_sell'), value: 10 });
      _list.push({ label: t('common.history_buy'), value: 11 });
    }
    _list.sort((a, b) => a.value - b.value);
    return _list;
  }, [t, i18n.language, address]);

  const { data: apiResponse, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['history', assets_name, page, size, sort, apiFilter, chain],
    queryFn: () =>
      marketApi.getHistory({
        offset: (page - 1) * size,
        size,
        assets_name,
        sort,
        filter: apiFilter === 0 ? undefined : apiFilter,
      }),
    enabled: !!assets_name,
  });

  const activities = useMemo((): Activity[] => {
    if (!apiResponse?.data?.order_list) {
      return [];
    }

    return apiResponse.data.order_list
      .map((order): Activity | null => {
        try {
          const quantity = Number(order.assets.amount);
          let unitPrice = Number(order.assets.unit_price);

          if (isNaN(quantity) || isNaN(unitPrice)) {
            console.warn(`Skipping order ${order.order_id}: Invalid quantity or price`);
            return null;
          }

          let priceInBtc: number;
          if (order.currency === 'SAT') {
            priceInBtc = unitPrice / 100_000_000;
          } else if (order.currency === 'BTC') {
            priceInBtc = unitPrice;
          } else {
            console.warn(`Skipping order ${order.order_id}: Unsupported currency ${order.currency}`);
            return null;
          }

          const totalValue = quantity * priceInBtc;
          const timeMs = order.txid ? order.txtime : order.order_time;
          const time = formatDistanceToNowStrict(new Date(timeMs), { addSuffix: true });

          // --- Determine Event Type Label --- 
          let eventTypeLabel = t('common.unknown'); // Default label
          let eventTypeStatus = order.result; // Assuming order.result maps to filter values 0-4

          // If user is logged in and order is executed (result=1), determine if it's buy/sell history
          if (address && order.result === 1) {
            if (order.address === address) { // User was the maker (original seller/buyer)
              eventTypeStatus = order.order_type === 1 ? 10 : 11;
            } else if (order.txaddress === address) { // User was the taker
               // If user was taker of a sell list (order_type=1), they bought -> history_buy (value 11)
               // If user was taker of a buy list (order_type=2), they sold -> history_sell (value 10)
              eventTypeStatus = order.order_type === 1 ? 11 : 10;
            } else {
              // User not involved, show standard 'Executed'
              eventTypeStatus = 1;
            }
          } else if (order.result === undefined || order.result === null) {
            // Handle cases where result might be missing, maybe default to 'List'?
             eventTypeStatus = 4; // Default to 'List' if result is missing? Needs confirmation.
          } else if (order.result === 0) {
             eventTypeStatus = 4; // Map result 0 to 'List' (value 4)
          }
          // Assuming result 1, 2, 3 directly map to filter values 1, 2, 3 otherwise

          const foundFilter = filterList.find(f => f.value === eventTypeStatus);
          if (foundFilter) {
            eventTypeLabel = foundFilter.label;
          } else {
             // Fallback if status doesn't match any known filter value
             console.warn(`Order ${order.order_id}: Unknown event status ${eventTypeStatus}, result: ${order.result}`);
             // Optionally use a more specific label based on result if possible
             eventTypeLabel = `${t('common.unknown')} (${eventTypeStatus})`;
          }
          // --- End Determine Event Type Label ---

          return {
            order_id: order.order_id,
            eventTypeLabel: eventTypeLabel, // Use the determined label
            quantity,
            price: priceInBtc,
            totalValue,
            time,
            txid: order.txid || undefined,
          };
        } catch (error) {
          console.error(`Error transforming order ${order.order_id}:`, order, error);
          return null;
        }
      })
      .filter((activity): activity is Activity => activity !== null);
  }, [apiResponse, address, filterList, t]); // Add dependencies: address, filterList, t

  const [activeTab, setActiveTab] = useState<'activities' | 'myActivities'>('activities');

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return <div className="text-center p-10">Loading activities...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error loading activities: {error.message}</div>;
  }

  // --- Determine Empty State Message ---
  // This logic might need refinement or could be passed to DataTable if made customizable
  const emptyMessage = apiResponse && activities.length === 0
    ? (apiFilter === 0 ? 'No activities found.' : `No activities match filter '${filterList.find(f => f.value === apiFilter)?.label || apiFilter}'.`)
    : 'No activities match the current filters.';

  return (
    <div className="bg-zinc-900/90 sm:p-6 rounded-lg text-zinc-200 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 sm:gap-4 mb-4 mt-4">
        <div className="flex gap-1 w-full sm:w-auto">
          <Button
            variant="ghost"
            className={`text-sm sm:text-base font-medium h-auto px-3 py-1.5 ${
              activeTab === 'activities'
                ? 'text-blue-500 border-b-2 border-blue-500 rounded-none'
                : 'text-gray-400 border-b-2 border-transparent rounded-none'
            }`}
            onClick={() => setActiveTab('activities')}
          >
            Activity
          </Button>
          <Button
            variant="ghost"
            className={`text-sm sm:text-base font-medium h-auto px-3 py-1.5 ${
              activeTab === 'myActivities'
                ? 'text-blue-500 border-b-2 border-blue-500 rounded-none'
                : 'text-gray-400 border-b-2 border-transparent rounded-none'
            }`}
            onClick={() => setActiveTab('myActivities')}
            disabled={!address}
          >
            My Activities
          </Button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 items-center">
          <Select
            value={String(apiFilter)}
            onValueChange={(value) => setApiFilter(Number(value))}
          >
            <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700 text-gray-300 h-8 text-xs sm:text-sm">
              <SelectValue placeholder={t('common.filter_placeholder')} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-300">
              {filterList.map((filter) => (
                <SelectItem
                  key={filter.value}
                  value={String(filter.value)}
                  className="text-xs sm:text-sm"
                >
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white transition-colors h-8 w-8"
            aria-label={t('common.refresh') || "Refresh"}
            onClick={handleRefresh}
          >
            <Icon icon="mdi:refresh" className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} data={activities} />
      </div>
    </div>
  );
};