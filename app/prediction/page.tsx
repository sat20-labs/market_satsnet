'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import Decimal from 'decimal.js';
import { toast } from 'sonner';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import clientApi from '@/api/clientApi';
import { useCommonStore } from '@/store/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { invokePredictionBet } from '@/domain/services/prediction';

const PAGE_SIZE = 10;
const PAGE_SIZES = [10, 20, 50, 100];
const CONTRACT_TYPE_AGENT = 3;

type PredictionOutcome = {
  id?: string;
  text?: string;
};

type PredictionContract = {
  subtype?: string;
  title?: string;
  description?: string;
  time_base?: 'unix' | 'height' | string;
  event_time?: number | string;
  bet_deadline?: number | string;
  confirm_after?: number | string;
  source_url?: string;
  bet_asset?: string;
  min_bet_unit?: string;
  outcomes?: PredictionOutcome[];
};

type PredictionRow = {
  contractURL: string;
  title: string;
  description: string;
  status: string;
  deployTime: number;
  deployTimeText: string;
  eventTimeText: string;
  betDeadlineText: string;
  confirmAfterText: string;
  betAsset: string;
  minBetUnit: string;
  sourceURL: string;
  outcomes: PredictionOutcome[];
  rawStatus: any;
};

type SelectedBet = {
  contract: PredictionRow;
  outcome: PredictionOutcome;
};

type PredictionContractDetails = {
  summary: any;
  analytics: any;
  history: any[];
  historyTotal: number;
  rawResponses: {
    summary?: any;
    analytics?: any;
    history?: any;
  };
};

type PredictionDetailSummary = {
  deployer: string;
  invokeCount: string;
  totalBets: string;
  totalAmount: string;
  updatedHeight: string;
  rawContent: string;
  rawResponse: string;
};

type OutcomeStats = {
  amount: string;
  bets: string;
};

function getField(source: any, ...keys: string[]) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

function parseJSONMaybe(value: any) {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function responseData(response: any) {
  const data = getField(response, 'data', 'Data');
  if (data !== undefined && data !== null) {
    return parseJSONMaybe(data);
  }
  const status = getField(response, 'status', 'Status');
  if (status !== undefined && status !== null) {
    return parseJSONMaybe(status);
  }
  return response;
}

function prettyJSON(value: any) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  if (typeof value === 'string') {
    const parsed = parseJSONMaybe(value);
    if (parsed !== value) {
      return JSON.stringify(parsed, null, 2);
    }
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function displayValue(value: any) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  if (typeof value === 'object') {
    return prettyJSON(value);
  }
  return String(value);
}

function firstDisplayValue(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return displayValue(value);
    }
  }
  return '-';
}

function getDetails(status: any) {
  return getField(status, 'details', 'Details') || {};
}

function getPrediction(status: any): PredictionContract | null {
  const details = getDetails(status);
  return (
    getField(status, 'prediction', 'Prediction') ||
    getField(details, 'prediction', 'Prediction') ||
    getField(status?.Contract, 'prediction', 'Prediction') ||
    null
  );
}

function isPredictionStatus(status: any, contractURL: string) {
  const prediction = getPrediction(status);
  if (prediction?.subtype === 'prediction') {
    return true;
  }

  const contractTypeID = Number(
    getField(status, 'contractTypeId', 'contractTypeID', 'ContractTypeID'),
  );
  const subtype = String(getField(status, 'subtype', 'Subtype') || '').toLowerCase();
  if (contractTypeID === CONTRACT_TYPE_AGENT && subtype === 'prediction') {
    return true;
  }

  const text = [
    contractURL,
    getField(status, 'contractType', 'ContractType'),
    getField(status, 'name', 'Name'),
    subtype,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return text.includes('agent') && text.includes('prediction');
}

function numericValue(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUnixLikeTime(value: any) {
  const time = numericValue(value);
  if (!time) return '-';
  const ms = time > 1000000000000 ? time : time * 1000;
  return new Date(ms).toLocaleString();
}

function formatPredictionTime(value: any, timeBase?: string) {
  const time = numericValue(value);
  if (!time) return '-';
  if (timeBase === 'height') return `#${time}`;
  return formatUnixLikeTime(time);
}

function formatDeployText(status: any) {
  const deployTime = numericValue(getField(status, 'deployTime', 'DeployTime'));
  if (deployTime) {
    return formatUnixLikeTime(deployTime);
  }

  const createdHeight = numericValue(getField(status, 'createdHeight', 'CreatedHeight'));
  if (createdHeight) {
    return `#${createdHeight}`;
  }

  return '-';
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('ready') || normalized.includes('betting')) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  if (normalized.includes('reject') || normalized.includes('invalid')) {
    return 'bg-red-500/15 text-red-300 border-red-500/30';
  }
  if (normalized.includes('confirm') || normalized.includes('settle')) {
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  }
  return 'bg-zinc-700/70 text-zinc-200 border-zinc-600';
}

function adaptPredictionRow(status: any, contractURL: string): PredictionRow | null {
  const address = contractURL || getField(status, 'address', 'Address') || '';
  const prediction = getPrediction(status);
  if (!prediction && !isPredictionStatus(status, address)) {
    return null;
  }

  const timeBase = prediction?.time_base || 'unix';
  const deployTime = numericValue(
    getField(status, 'deployTime', 'DeployTime', 'createdHeight', 'CreatedHeight'),
  );
  const statusText = String(getField(status, 'status', 'Status') || 'Unknown');
  const outcomes = prediction?.outcomes;

  return {
    contractURL: address,
    title: prediction?.title || getField(status, 'name', 'Name') || 'Prediction',
    description: prediction?.description || '',
    status: statusText,
    deployTime,
    deployTimeText: formatDeployText(status),
    eventTimeText: formatPredictionTime(prediction?.event_time, timeBase),
    betDeadlineText: formatPredictionTime(prediction?.bet_deadline, timeBase),
    confirmAfterText: formatPredictionTime(prediction?.confirm_after, timeBase),
    betAsset: prediction?.bet_asset || '-',
    minBetUnit: prediction?.min_bet_unit || '-',
    sourceURL: prediction?.source_url || '',
    outcomes: Array.isArray(outcomes) ? outcomes : [],
    rawStatus: status,
  };
}

async function settleContractRequest(request: Promise<any>) {
  try {
    return await request;
  } catch (error) {
    return {
      code: -1,
      msg: error instanceof Error ? error.message : String(error),
    };
  }
}

async function loadPredictionContractDetails(contractURL: string): Promise<PredictionContractDetails> {
  const [summaryResponse, analyticsResponse, historyResponse] = await Promise.all([
    settleContractRequest(clientApi.getContract(contractURL)),
    settleContractRequest(clientApi.getContractAnalytics(contractURL)),
    settleContractRequest(clientApi.getContractHistory(contractURL, 0, 0)),
  ]);

  const historyData = getField(historyResponse, 'data', 'Data');
  return {
    summary: responseData(summaryResponse),
    analytics: responseData(analyticsResponse),
    history: Array.isArray(historyData) ? historyData : [],
    historyTotal: numericValue(getField(historyResponse, 'total', 'Total')),
    rawResponses: {
      summary: summaryResponse,
      analytics: analyticsResponse,
      history: historyResponse,
    },
  };
}

async function loadPredictionAnalyticsMap(contractURLs: string[]) {
  const uniqueURLs = Array.from(new Set(contractURLs.filter(Boolean)));
  const entries = await Promise.all(
    uniqueURLs.map(async (contractURL) => {
      const response = await settleContractRequest(clientApi.getContractAnalytics(contractURL));
      return [contractURL, responseData(response)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<string, any>;
}

function findDeployRecord(history: any[]) {
  return history.find((record) => String(getField(record, 'kind', 'Kind') || '') === 'deploy');
}

function countInvokeRecords(history: any[]) {
  return history.filter(
    (record) => String(getField(record, 'kind', 'Kind') || '') === 'invoke',
  ).length;
}

function buildPredictionDetailSummary(
  contract: PredictionRow,
  details?: PredictionContractDetails,
): PredictionDetailSummary {
  const summary = details?.summary || contract.rawStatus || {};
  const analytics = details?.analytics || {};
  const summaryDetails = getDetails(summary);
  const analyticsContract = getField(analytics, 'contract', 'Contract');
  const prediction = getPrediction(summary) || analyticsContract || null;
  const history = details?.history || [];
  const deployRecord = findDeployRecord(history) || {};
  const deployDetails = getDetails(deployRecord);
  const invokeCount =
    countInvokeRecords(history) ||
    numericValue(getField(analytics, 'invokeCount', 'InvokeCount', 'totalInvokes', 'TotalInvokes')) ||
    numericValue(getField(analytics, 'totalBets', 'TotalBets')) +
      numericValue(getField(analytics, 'confirmations', 'Confirmations')) +
      numericValue(getField(analytics, 'rejections', 'Rejections'));

  const rawContent =
    prediction ||
    getField(summaryDetails, 'contract', 'Contract', 'content', 'Content') ||
    getField(summary, 'contract', 'Contract', 'content', 'Content') ||
    summaryDetails ||
    summary;

  return {
    deployer: firstDisplayValue(
      getField(summary, 'deployer', 'Deployer', 'creator', 'Creator', 'owner', 'Owner'),
      getField(summaryDetails, 'deployer', 'Deployer', 'creator', 'Creator', 'owner', 'Owner'),
      getField(deployRecord, 'actor', 'Actor', 'deployer', 'Deployer'),
      getField(deployDetails, 'actor', 'Actor', 'deployer', 'Deployer'),
    ),
    invokeCount: invokeCount ? String(invokeCount) : '-',
    totalBets: firstDisplayValue(getField(analytics, 'totalBets', 'TotalBets')),
    totalAmount: firstDisplayValue(
      getField(analytics, 'totalAmount', 'TotalAmount', 'totalBetAmount', 'TotalBetAmount'),
      getField(summary, 'totalAmount', 'TotalAmount'),
      getField(summaryDetails, 'totalAmount', 'TotalAmount'),
    ),
    updatedHeight: firstDisplayValue(
      getField(analytics, 'updatedHeight', 'UpdatedHeight'),
      getField(summary, 'updatedHeight', 'UpdatedHeight'),
    ),
    rawContent: prettyJSON(rawContent),
    rawResponse: prettyJSON({
      summary,
      analytics,
      history,
    }),
  };
}

function getOutcomeStats(analytics: any, outcome: PredictionOutcome): OutcomeStats {
  if (!analytics || !outcome.id) {
    return { amount: '-', bets: '-' };
  }

  const outcomes = getField(analytics, 'outcomes', 'Outcomes') || {};
  const outcomeBets = getField(analytics, 'outcomeBets', 'OutcomeBets') || {};
  const current = outcomes[outcome.id] || outcomes[String(outcome.id).toUpperCase()] || {};

  return {
    amount: firstDisplayValue(getField(current, 'amount', 'Amount'), '0'),
    bets: firstDisplayValue(getField(current, 'bets', 'Bets'), outcomeBets[outcome.id], '0'),
  };
}

function formatOutcomeAmount(amount: string, asset: string) {
  if (amount === '-' || !asset || asset === '-') {
    return amount;
  }
  return `${amount} ${asset}`;
}

async function loadPredictionContracts() {
  const response = await clientApi.getContracts({
    contract_type_id: CONTRACT_TYPE_AGENT,
    subtype: 'prediction',
    sort: 'created_height',
    order: 'desc',
    start: 0,
    limit: 0,
  });

  if (response?.code === -1) {
    throw new Error(response?.msg || 'Failed to load prediction contracts');
  }

  const summaries = response?.data || response?.Data || [];
  return summaries
    .map((summary: any) => adaptPredictionRow(summary, getField(summary, 'address', 'Address') || ''))
    .filter(Boolean)
    .sort((a, b) => (b?.deployTime || 0) - (a?.deployTime || 0)) as PredictionRow[];
}

function ContractUrl({ value }: { value: string }) {
  const short = value.length > 24 ? `${value.slice(0, 12)}...${value.slice(-10)}` : value;
  return <span title={value}>{short}</span>;
}

function outcomeLabel(outcome: PredictionOutcome) {
  return `${outcome.id ? `${outcome.id}. ` : ''}${outcome.text || '-'}`;
}

function isValidAmount(value: string) {
  try {
    return new Decimal(value).gt(0);
  } catch {
    return false;
  }
}

function isValidMinBetUnit(value: string) {
  try {
    return value !== '-' && new Decimal(value).gt(0);
  } catch {
    return false;
  }
}

function isMultipleOfMin(value: string, min: string) {
  try {
    return new Decimal(value).mod(new Decimal(min)).isZero();
  } catch {
    return false;
  }
}

export default function PredictionContractsPage() {
  const { t } = useTranslation();
  const { network } = useCommonStore();
  const { address, connected } = useReactWalletStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedBet, setSelectedBet] = useState<SelectedBet | null>(null);
  const [selectedContract, setSelectedContract] = useState<PredictionRow | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betSubmitting, setBetSubmitting] = useState(false);

  const {
    data: predictionList = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['predictionContracts', network],
    queryFn: loadPredictionContracts,
    gcTime: 0,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const {
    data: contractDetails,
    isFetching: isDetailsFetching,
  } = useQuery({
    queryKey: ['predictionContractDetails', network, selectedContract?.contractURL],
    queryFn: () => loadPredictionContractDetails(selectedContract?.contractURL || ''),
    enabled: !!selectedContract?.contractURL,
    gcTime: 0,
  });

  const totalPages = Math.ceil(predictionList.length / pageSize);
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return predictionList.slice(start, start + pageSize);
  }, [predictionList, currentPage, pageSize]);
  const pagedContractURLs = useMemo(
    () => pagedList.map((item) => item.contractURL).filter(Boolean),
    [pagedList],
  );

  const {
    data: analyticsByContract = {},
  } = useQuery({
    queryKey: ['predictionOutcomeAnalytics', network, pagedContractURLs.join('|')],
    queryFn: () => loadPredictionAnalyticsMap(pagedContractURLs),
    enabled: pagedContractURLs.length > 0,
    gcTime: 0,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const selectedDetailSummary = useMemo(
    () => (selectedContract ? buildPredictionDetailSummary(selectedContract, contractDetails) : null),
    [selectedContract, contractDetails],
  );

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const openBetDialog = (contract: PredictionRow, outcome: PredictionOutcome) => {
    if (!connected || !address) {
      toast.error(t('pages.prediction.connect_wallet'));
      return;
    }
    if (!outcome.id) {
      toast.error(t('pages.prediction.invalid_outcome'));
      return;
    }
    if (!contract.betAsset || contract.betAsset === '-') {
      toast.error(t('pages.prediction.invalid_asset'));
      return;
    }
    if (!isValidMinBetUnit(contract.minBetUnit)) {
      toast.error(t('pages.prediction.invalid_min'));
      return;
    }

    setSelectedBet({ contract, outcome });
    setBetAmount(contract.minBetUnit);
  };

  const closeBetDialog = () => {
    if (betSubmitting) return;
    setSelectedBet(null);
    setBetAmount('');
  };

  const confirmBet = async () => {
    if (!selectedBet) return;
    const outcomeID = selectedBet.outcome.id;
    if (!outcomeID) return;
    const { contract } = selectedBet;
    const trimmedAmount = betAmount.trim();

    if (!connected || !address) {
      toast.error(t('pages.prediction.connect_wallet'));
      return;
    }
    if (!isValidAmount(trimmedAmount)) {
      toast.error(t('pages.prediction.invalid_amount'));
      return;
    }
    if (!isMultipleOfMin(trimmedAmount, contract.minBetUnit)) {
      toast.error(t('pages.prediction.amount_multiple_error', { min: contract.minBetUnit }));
      return;
    }

    setBetSubmitting(true);
    try {
      await invokePredictionBet(
        contract.contractURL,
        outcomeID,
        contract.betAsset,
        trimmedAmount,
      );
      toast.success(t('pages.prediction.bet_submitted'));
      setSelectedBet(null);
      setBetAmount('');
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('pages.prediction.bet_failed');
      toast.error(message || t('pages.prediction.bet_failed'));
    } finally {
      setBetSubmitting(false);
    }
  };

  const renderOutcomeAction = (item: PredictionRow, outcome: PredictionOutcome) => {
    const stats = getOutcomeStats(analyticsByContract[item.contractURL], outcome);
    return (
      <div
        key={outcome.id || outcome.text}
        className="min-w-[150px] max-w-full flex-1 sm:flex-none"
      >
        <Button
          size="sm"
          className="group min-h-9 w-full rounded-md border border-primary/70 bg-primary/15 px-3 text-xs font-semibold text-primary shadow-[0_0_0_1px_rgba(59,130,246,0.18)] transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/70"
          onClick={() => openBetDialog(item, outcome)}
        >
          <Icon icon="lucide:mouse-pointer-click" className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">{outcomeLabel(outcome)}</span>
          <span className="ml-2 shrink-0 rounded-sm bg-primary/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary transition-colors group-hover:bg-white/20 group-hover:text-white">
            {t('pages.prediction.bet_action')}
          </span>
        </Button>
        <div className="mt-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] leading-snug text-zinc-400">
          <div className="flex items-center justify-between gap-2">
            <span>{t('pages.prediction.outcome_amount')}</span>
            <span className="truncate text-zinc-200">
              {formatOutcomeAmount(stats.amount, item.betAsset)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span>{t('pages.prediction.outcome_bets')}</span>
            <span className="text-zinc-200">{stats.bets}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 relative">
      <div className="my-2 px-2 sm:px-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon icon="mdi:flask-outline" className="text-xl text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              {t('pages.prediction.title')}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.prediction.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-fit border-zinc-700 bg-zinc-900/70"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <Icon
            icon="mdi:refresh"
            className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
          />
          {t('pages.prediction.refresh')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
        </div>
      )}

      {error && (
        <div className="mx-2 my-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {t('pages.prediction.load_failed')}
        </div>
      )}

      <div className="sm:hidden space-y-3 mt-2">
        {pagedList.map((item) => (
          <div
            key={item.contractURL}
            className="rounded-lg bg-zinc-900/70 border border-zinc-800 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  data-testid="prediction-title-button"
                  className="max-w-full rounded-sm text-left text-primary text-sm font-semibold leading-tight break-words transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  onClick={() => setSelectedContract(item)}
                  aria-label={t('pages.prediction.view_details')}
                >
                  {item.title}
                </button>
                <div className="mt-1 text-[11px] text-zinc-500">
                  <ContractUrl value={item.contractURL} />
                </div>
              </div>
              <Badge className={`shrink-0 border ${statusBadgeClass(item.status)}`}>
                {item.status}
              </Badge>
            </div>
            {item.description && (
              <p className="mt-2 text-xs text-zinc-400 line-clamp-3">
                {item.description}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
              <div>{t('pages.prediction.asset')}: {item.betAsset}</div>
              <div>{t('pages.prediction.min')}: {item.minBetUnit}</div>
              <div>{t('pages.prediction.event')}: {item.eventTimeText}</div>
              <div>{t('pages.prediction.deploy')}: {item.deployTimeText}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {item.outcomes.map((outcome) => renderOutcomeAction(item, outcome))}
            </div>
          </div>
        ))}
        {pagedList.length === 0 && !isLoading && (
          <div className="text-center py-8 text-sm text-zinc-500">
            {t('common.no_data') || 'No Data'}
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto w-full px-3 py-3 bg-zinc-900/80 rounded-lg hidden sm:block">
        <Table className="w-full table-auto border-collapse rounded-lg shadow-md min-w-[1100px] bg-zinc-900/50">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.prediction')}
              </TableHead>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.status')}
              </TableHead>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.bet_asset')}
              </TableHead>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.outcomes')}
              </TableHead>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.event_time')}
              </TableHead>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.bet_deadline')}
              </TableHead>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.deploy_time')}
              </TableHead>
              <TableHead className="px-4 py-2 bg-zinc-900 text-muted-foreground">
                {t('pages.prediction.source')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedList.map((item) => (
              <TableRow
                key={item.contractURL}
                className="border-b border-border hover:bg-accent transition-colors"
              >
                <TableCell className="px-4 py-4 min-w-[260px]">
                  <button
                    type="button"
                    data-testid="prediction-title-button"
                    className="rounded-sm text-left font-semibold text-primary leading-snug transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    onClick={() => setSelectedContract(item)}
                    aria-label={t('pages.prediction.view_details')}
                  >
                    {item.title}
                  </button>
                  <div className="mt-1 text-xs text-zinc-500">
                    <ContractUrl value={item.contractURL} />
                  </div>
                  {item.description && (
                    <div className="mt-2 max-w-[420px] text-xs text-zinc-400 line-clamp-2">
                      {item.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-4 py-4">
                  <Badge className={`border ${statusBadgeClass(item.status)}`}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div>{item.betAsset}</div>
                  <div className="text-xs text-zinc-500">
                    {t('pages.prediction.min')} {item.minBetUnit}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 max-w-[260px]">
                  <div className="flex flex-wrap gap-1">
                    {item.outcomes.length > 0
                      ? item.outcomes.map((outcome) => renderOutcomeAction(item, outcome))
                      : '-'}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-nowrap">
                  {item.eventTimeText}
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-nowrap">
                  {item.betDeadlineText}
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-nowrap">
                  {item.deployTimeText}
                </TableCell>
                <TableCell className="px-4 py-4 max-w-[220px]">
                  {item.sourceURL ? (
                    <a
                      href={item.sourceURL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                    >
                      {t('pages.prediction.source_link')}
                      <Icon icon="mdi:open-in-new" className="h-4 w-4 shrink-0" />
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagedList.length === 0 && !isLoading && (
          <div className="text-center py-8 text-sm text-zinc-500">
            {t('common.no_data') || 'No Data'}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/80 px-4 py-0 rounded-lg flex flex-row items-center justify-between gap-3 border-t border-zinc-800">
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          availablePageSizes={PAGE_SIZES}
          isLoading={isLoading}
        />
      </div>

      <Dialog open={!!selectedContract} onOpenChange={(open) => !open && setSelectedContract(null)}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{t('pages.prediction.details_title')}</DialogTitle>
          </DialogHeader>

          {selectedContract && selectedDetailSummary && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-base font-semibold text-primary">
                  {selectedContract.title}
                </div>
                {selectedContract.description && (
                  <div className="mt-2 text-sm text-zinc-300">
                    {selectedContract.description}
                  </div>
                )}
                <div className="mt-2 text-xs text-zinc-500 break-all">
                  {t('pages.prediction.contract_address')}: {selectedContract.contractURL}
                </div>
              </div>

              {isDetailsFetching && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.status')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedContract.status}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.deployer')}</div>
                  <div className="mt-1 break-all font-medium text-zinc-100">{selectedDetailSummary.deployer}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.invoke_count')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedDetailSummary.invokeCount}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.total_amount')}</div>
                  <div className="mt-1 break-all font-medium text-zinc-100">{selectedDetailSummary.totalAmount}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.total_bets')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedDetailSummary.totalBets}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.updated_height')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedDetailSummary.updatedHeight}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.event_time')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedContract.eventTimeText}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.bet_deadline')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedContract.betDeadlineText}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.bet_asset')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedContract.betAsset}</div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-500">{t('pages.prediction.min')}</div>
                  <div className="mt-1 font-medium text-zinc-100">{selectedContract.minBetUnit}</div>
                </div>
              </div>

              {selectedContract.outcomes.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-zinc-400">
                    {t('pages.prediction.outcomes')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedContract.outcomes.map((outcome) => (
                      <Badge
                        key={outcome.id || outcome.text}
                        className="border border-zinc-700 bg-zinc-800 text-zinc-100"
                      >
                        {outcomeLabel(outcome)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-medium text-zinc-400">
                  {t('pages.prediction.raw_contract_content')}
                </div>
                <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300">
                  {selectedDetailSummary.rawContent}
                </pre>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-zinc-400">
                  {t('pages.prediction.raw_indexer_response')}
                </div>
                <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300">
                  {selectedDetailSummary.rawResponse}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedContract(null)}>
              {t('pages.prediction.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBet} onOpenChange={(open) => !open && closeBetDialog()}>
        <DialogContent className="sm:max-w-[440px] bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{t('pages.prediction.bet_title')}</DialogTitle>
          </DialogHeader>

          {selectedBet && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-xs text-zinc-500">{t('pages.prediction.bet_target')}</div>
                <div className="mt-1 font-medium text-zinc-100">
                  {outcomeLabel(selectedBet.outcome)}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {t('pages.prediction.bet_contract')}: <ContractUrl value={selectedBet.contract.contractURL} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400" htmlFor="prediction-bet-amount">
                  {t('pages.prediction.bet_amount')} ({selectedBet.contract.betAsset})
                </label>
                <Input
                  id="prediction-bet-amount"
                  value={betAmount}
                  onChange={(event) => setBetAmount(event.target.value)}
                  placeholder={t('pages.prediction.bet_amount_placeholder')}
                  disabled={betSubmitting}
                  inputMode="decimal"
                  className="bg-zinc-950 border-zinc-700"
                />
                <div className="text-xs text-zinc-500">
                  {t('pages.prediction.bet_amount_hint', { min: selectedBet.contract.minBetUnit })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeBetDialog} disabled={betSubmitting}>
              {t('pages.prediction.cancel')}
            </Button>
            <Button onClick={confirmBet} disabled={betSubmitting}>
              {betSubmitting
                ? t('pages.prediction.submitting')
                : t('pages.prediction.confirm_bet')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
