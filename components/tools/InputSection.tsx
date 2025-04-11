import { Button, Input, Select, SelectItem } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { getTickLabel, hideStr } from '@/lib';
import { useState } from 'react';

export function InputSection({
  inputList,
  tickerList,
  handleTickerSelectChange,
  handleUtxoSelectChange,
  setInputList,
  loading,
}) {
  const { t } = useTranslation();
  const [loadingStates, setLoadingStates] = useState({});

  const addInputItem = () => {
    const tickers = tickerList?.map((item) => item.ticker) || [];

    const newId = inputList.items.length + 1;
    const newItem = {
      id: newId,
      value: {
        ticker: '',
        utxo: '',
        sats: 0,
        unit: 'sats',
      },
      options: {
        tickers: tickers,
        utxos: [],
      },
    };
    setInputList('items', [...inputList.items, newItem]);
  };

  const removeInputItem = (id: number) => {
    if (inputList.items.length > 1) {
      const tmpItems = inputList.items.filter((item) => item.id !== id);
      tmpItems.forEach((item, index) => {
        item.id = index + 1;
      });
      setInputList('items', tmpItems);
    }
  };

  const handleInputUnitSelectChange = (itemId, e) => {
    const unit = e.target.value;
    inputList.items[itemId - 1].value.unit = unit;
    setInputList('items', inputList.items);
  };

  const handleTickerChange = async (itemId, ticker) => {
    setLoadingStates((prev) => ({ ...prev, [itemId]: true }));
    await handleTickerSelectChange(itemId, ticker);
    setLoadingStates((prev) => ({ ...prev, [itemId]: false }));
  };
  console.log('inputList', inputList);
  const testUtxos = [
    {
      txid: 'f846fdea207b20279f4bd7bb3e983a44ef7c87d44ebebabecd2b88d74fac505e',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '2c5614c3553918fde533161941e23b7adb2406dc253501f91b31a876ac667b06',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '45e0c99fad42b2d2ba1a7fd25e82b29a65d9bcfc306746dd0aed3eae3be56173',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '541025b88f50d8672fce04532418730c78a26ad39fa5f51533a6d401d7da1f82',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'c09f73dfdb66ceaa6dc6106096033f72232dd96e0db631b572b6cc3f5bb6c280',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '94fdc9de79842c32976c3a62cdc5ca2b646c9756ab31723ea59a420529bfa1e3',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'bf04fe6b08f25d69d3ad1fb66a63e0a528ca733fe1ac9e368f60ef3e1ac7d1ec',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'fcc72afa1dd19b068e5e38847eb45aeb81e5dbb77ef0d4e4ee71dcab816f8b24',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '6ab3153efd8953d8f64cadf2a723f64ef2eb5d0ad1c1867515584d00b75fa46e',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '3e03ba5a089f1b5538dc4885103b7ef7bc01a9689241cfa1cc006634ee282b1d',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '045e5495ee1ab2188db158e231d1fe354ef41c1e195e0a2d61033119d90053bc',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '2069aae4db37d33a3ace883e4413e05f0a5acb2e646735a0eef0c35851eec7cb',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '8d8f2982a0255260eef2c43b9a0e5d9ba562ebd7760ba2aa5b7247512aa791df',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '61217f71596310947f20c8cc7e175813b7728390cef7a09e41aed086d3eebde8',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '9f1791905fbb8a31ba4b09529792f9f8287724c934677088994b134e3f3140e9',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'fed3bea6a91cb470717a1e2811864d7776a04925d391eb3b6088130477ee7801',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'b21e76aa033b4ebb503823092ac08514f78a3ebcffb75812c8e3c61b958534c3',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'c7c6b0b9b3e67a988866ed57de0c273fb22794f3b997f7143bfec84a178ea602',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '02455a7dd64f3ccd1914795bb8b4b143214234664ca7912288c3c6ade0ea4d03',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '596cd700f913b2429bee1f56417522dac85914ed41040d00728d90bd5b518411',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'c4a24d85584ea911cb4a5dae76dc5411be5330369e79a98aceb125bba917b019',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '979b5336073fb035fdfc50e9b2e3142dc11afda6a858b7a14138b385083c332e',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '41b271dba51cefbbcb649ff2106b88101d2aba69a87e2f993c57a3f2ceaefb3a',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '97ed496c926f78b8c2f187892646fde5abd20892e1c810a456ffd45e69e27f68',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '4b4af3d0ff63c5b0e7c5200773f1659321a9e36f8a11fc41d05043e6f885476b',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'f980aaa07f20ef725fed3a0362f40d7dbf32cdfae82b2d91016645d6bf00f87a',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '9ea5bce5a23c239da39b26df0c3305c64389051e7965501847cf98895e800e7c',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '72165a218d6ae7d23edcc2c5abfa89c26697b43331818de8f6d3bcb4ab459b8e',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '6e29e77dd150c590bd2a36ae4e24a148635161a26573a23c20d509058e6ae697',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'a36cf6d72f592c41833d43cd4f9b9973f1e942948dfab24e093ebbbc2466699c',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'f0481ece54b04559a6b5cc8c1a74fb957f011d9c59714d4f77a55659ee0d32ab',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'eb70d63d1cde1b95cfbd5b37a93009ce014a45f87c8b29b056f7201547ae51b3',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '36c556e9675e2bcfe9845a6276468b1fef742220e567c5bfa202df83d0cb26bb',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '6a90ad741b9ddc3d171f2bcc9988e6407e02db2e421c526c7b3808b3764f1bea',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '80262ab2930b8a53b00de7bfdb1a8fff23818e7b109dae5d356e40636f5e05ef',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: 'ab19f3f78580cc41aa78619b781db21da782ab64d47b6bc56b08374eda0558f2',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '37f467c335e342df38961002ca815e69aadbc7de02a449ce42b2a389f564f8fd',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '67efe36a837e6eef22bde653b7948f0cc0b1c9cbc6968344d9184ab8299e525d',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '251377663d8354f4d8ef2a0b2d7fe694c17c2f442f130f5ec534d69e405ddbbd',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '4b739d2cca725139b0514b34264b773cafd2e803dd952fd77e7b4c2ca1273e3c',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '9f03399350b8b6e02c2c18f9d8615c1b471dab0c4df4cd9e58ac09526a4ec69f',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '46f2b84c7458a3a3c56b780182de16d55be92bce1f4ac3f7ad44e4734d7fd0bb',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '105635dd85ab8ab906e3e666b3149acc20659c44077ba9fb58cfbd580fe0dceb',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
    {
      txid: '765dec5a8b4c94aaed92211f02ec14e2e53275b6b334047310e6b6a4bd38faf9',
      vout: 0,
      value: 10000,
      assetamount: 10000,
    },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-base sm:text-lg font-semibold">
        {t('pages.tools.transaction.input')} UTXO
      </h2>
      <div className="space-y-3 sm:space-y-4">
        {inputList.items.map((item, i) => (
          <div
            key={i}
            className="border border-divider bg-content1 p-2 sm:p-3 rounded-lg space-y-2 sm:space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-medium">
                Input {i + 1}
              </span>
              <div className="flex space-x-1 sm:space-x-2">
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  onClick={addInputItem}
                  className="min-w-[24px] sm:min-w-[32px] h-6 sm:h-8 px-1 sm:px-2"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onClick={() => removeInputItem(item.id)}
                  className="min-w-[24px] sm:min-w-[32px] h-6 sm:h-8 px-1 sm:px-2"
                  isDisabled={inputList.items.length === 1}
                >
                  -
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              <Select
                label="Ticker"
                placeholder="Select Ticker"
                size="sm"
                className="w-full"
                selectedKeys={item.value?.ticker ? [item.value.ticker] : []}
                onChange={(e) => handleTickerChange(item.id, e.target.value)}
                isLoading={loadingStates[item.id] || loading}
              >
                {tickerList?.map((utxo) => (
                  <SelectItem key={utxo.ticker} value={utxo.ticker}>
                    {getTickLabel(utxo.ticker)}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="UTXO"
                placeholder="Select UTXO"
                size="sm"
                className="w-full"
                selectedKeys={item.value?.utxo ? [item.value.utxo] : []}
                onChange={(e) =>
                  handleUtxoSelectChange(item.id, e.target.value)
                }
                isLoading={loadingStates[item.id] || loading}
              >
                {item.options?.utxos?.map((utxo) => (
                  <SelectItem
                    key={utxo.txid + ':' + utxo.vout}
                    textValue={utxo.txid + ':' + utxo.vout}
                  >
                    <div className="truncate text-xs sm:text-sm">
                      {utxo.assetamount && utxo.assetamount + ' Asset/'}
                      {utxo.value +
                        ' sats - ' +
                        hideStr(utxo.txid + ':' + utxo.vout)}
                    </div>
                  </SelectItem>
                ))}
              </Select>
              <Input
                type="number"
                label="Amount"
                placeholder="0"
                size="sm"
                readOnly
                className="w-full"
                value={
                  item.value.unit === 'sats'
                    ? item.value.sats
                    : item.value.sats / 100000000
                }
                endContent={
                  <Select
                    aria-label="Select unit"
                    size="sm"
                    className="w-24 sm:w-32 min-w-max"
                    selectedKeys={[item.value.unit]}
                    onChange={(e) => handleInputUnitSelectChange(item.id, e)}
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
