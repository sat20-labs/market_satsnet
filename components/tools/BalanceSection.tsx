import { Input, Select, SelectItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';

export function BalanceSection({ balance, setBalance, address }) {
  const { t } = useTranslation();

  const handleBalanceUnitSelectChange = (e: any) => {
    const unit = e.target.value;
    setBalance('unit', unit);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base sm:text-lg font-semibold">
          {t('pages.tools.transaction.balance')}
        </h2>
        <span className="text-xs sm:text-sm text-gray-400">
          ({t('pages.tools.transaction.balance_des')})
        </span>
      </div>
      <div className="border border-divider bg-content1 p-2 sm:p-3 rounded-lg  space-y-2 sm:space-y-3">
        <Input
          label="Current Address"
          value={address}
          readOnly
          size="sm"
          className="w-full"
        />
        <Input
          type="number"
          label="Balance"
          placeholder="0"
          size="sm"
          value={
            balance.unit === 'sats' ? balance.sats : balance.sats / 100000000
          }
          className="w-full"
          endContent={
            <Select
              aria-label="Select unit"
              size="sm"
              className="w-24 sm:w-32 min-w-max"
              selectedKeys={[balance.unit]}
              onChange={(e) => handleBalanceUnitSelectChange(e)}
            >
              <SelectItem key="sats" value="sats">
                sats
              </SelectItem>
              <SelectItem key="btc" value="btc">
                btc
              </SelectItem>
            </Select>
          }
        />
      </div>
    </div>
  );
}
