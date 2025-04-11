import { Button, Input, Select, SelectItem, Tooltip } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';

export function OutputSection({ outputList, setOutputList, address }) {
  const { t } = useTranslation();

  const addOutputItem = () => {
    const newId = outputList.items.length + 1;
    const newItem = {
      id: newId,
      num: 1,
      value: {
        sats: 0,
        unit: 'sats',
        address: '',
      },
    };

    setOutputList('items', [...outputList.items, newItem]);
  };

  const removeOutputItem = (id: number) => {
    if (outputList.items.length > 1) {
      const tmpItems = outputList.items.filter((item) => item.id !== id);
      tmpItems.forEach((item, index) => {
        item.id = index + 1;
      });
      setOutputList('items', tmpItems);
    }
  };

  const setBtcAddress = (itemId: number, address: string) => {
    outputList.items[itemId - 1].value.address = address;
    setOutputList('items', outputList.items);
  };

  const setOutputSats = (itemId: number, sats: string) => {
    console.log(sats);

    const unit = outputList.items[itemId - 1].value.unit;
    if (unit === 'sats') {
      outputList.items[itemId - 1].value.sats = Number(sats);
    } else {
      outputList.items[itemId - 1].value.sats = Number(sats) * 100000000;
    }

    setOutputList('items', outputList.items);
  };
  const setOutputNum = (itemId: number, num: string) => {
    console.log(Number(num));

    outputList.items[itemId - 1].num = Number(num);
    setOutputList('items', outputList.items);
  };
  const handleOutputUnitSelectChange = (itemId: number, e: any) => {
    const unit = e.target.value;
    outputList.items[itemId - 1].value.unit = unit;
    setOutputList('items', outputList.items);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base sm:text-lg font-semibold">
        {t('pages.tools.transaction.output')} UTXO
      </h2>
      <div className="space-y-3 sm:space-y-4">
        {outputList.items.map((item, i) => (
          <div
            key={i}
            className="border border-divider bg-content1 p-2 sm:p-3 rounded-lg space-y-2 sm:space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-medium">
                Output {i + 1}
              </span>
              <div className="flex space-x-1 sm:space-x-2">
                <Input
                  type="number"
                  placeholder="0"
                  size="sm"
                  className="w-20"
                  value={item.num?.toString()}
                  onChange={(e) => setOutputNum(item.id, e.target.value)}
                  // endContent={<span>个</span>}
                />
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  onClick={addOutputItem}
                  className="min-w-[24px] sm:min-w-[32px] h-6 sm:h-8 px-1 sm:px-2"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onClick={() => removeOutputItem(item.id)}
                  className="min-w-[24px] sm:min-w-[32px] h-6 sm:h-8 px-1 sm:px-2"
                  isDisabled={outputList.items.length === 1}
                >
                  -
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              <Input
                label="BTC Address"
                placeholder="Enter BTC Address"
                size="sm"
                value={item.value.address}
                onChange={(e) => setBtcAddress(item.id, e.target.value)}
                className="w-full"
                endContent={
                  <Tooltip content="Fill the BTC address of the current account">
                    <Button
                      size="sm"
                      variant="flat"
                      onClick={() => setBtcAddress(item.id, address)}
                      className="px-1 sm:px-2 min-w-[40px] sm:min-w-[60px]"
                    >
                      Copy
                    </Button>
                  </Tooltip>
                }
              />
              <Input
                type="number"
                label="Amount"
                placeholder="0"
                size="sm"
                className="w-full"
                value={
                  item.value.unit === 'sats'
                    ? item.value.sats
                    : item.value.sats / 100000000
                }
                onChange={(e) => setOutputSats(item.id, e.target.value)}
                endContent={
                  <Select
                    aria-label="Select unit"
                    size="sm"
                    className="w-24 sm:w-32 min-w-max"
                    selectedKeys={[item.value.unit]}
                    onChange={(e) => handleOutputUnitSelectChange(item.id, e)}
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
        ))}
      </div>
    </div>
  );
}
