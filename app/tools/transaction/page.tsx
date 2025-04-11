'use client';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
} from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { useTransferToolData } from '@/components/tools/useTransferToolData';
import { InputSection } from '@/components/tools/InputSection';
import { OutputSection } from '@/components/tools/OutputSection';
import { BalanceSection } from '@/components/tools/BalanceSection';
import { TransactionButton } from '@/components/tools/TransactionButton';

export default function TransferTool() {
  const { t } = useTranslation();
  const {
    fee,
    loading,
    address,
    inputList,
    outputList,
    balance,
    tickerList,
    handleTickerSelectChange,
    handleUtxoSelectChange,
    setInputList,
    setOutputList,
    setBalance,
    splitHandler,
    feeRate,
  } = useTransferToolData();

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6">
      <Card className="w-full">
        <CardHeader className="flex flex-col items-start p-3 sm:p-4">
          <h1 className="text-lg sm:text-xl font-bold uppercase">
            {t('pages.tools.transaction.title')}
          </h1>
        </CardHeader>
        <Divider />
        <CardBody className="p-3 sm:p-4">
          <div className="space-y-4 sm:space-y-6">
            <InputSection
              loading={loading}
              inputList={inputList}
              tickerList={tickerList}
              handleTickerSelectChange={handleTickerSelectChange}
              handleUtxoSelectChange={handleUtxoSelectChange}
              setInputList={setInputList}
            />
            <Divider />
            <OutputSection
              outputList={outputList}
              setOutputList={setOutputList}
              address={address}
            />
            <Divider />
            <BalanceSection
              balance={balance}
              setBalance={setBalance}
              address={address}
            />
          </div>
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col items-center p-3 sm:p-4">
          <TransactionButton
            loading={loading}
            splitHandler={splitHandler}
            fee={fee}
            feeRate={feeRate}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
