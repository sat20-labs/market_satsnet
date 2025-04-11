'use client';
import { Button, ButtonGroup, Card, CardBody } from '@nextui-org/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InscribeOrdx } from '@/components/inscribe/InscribeOrdx';
import { InscribeText } from '@/components/inscribe/InscribeText';
import { InscribeFiles } from '@/components/inscribe/InscribeFiles';
import { InscribeOrdxName } from '@/components/inscribe/InscribeOrdxName';
import { InscribeStepTwo } from '@/components/inscribe/InscribeStepTwo';
import { InscribeStepThree } from '@/components/inscribe/InscribeStepThree';
import { useMap, useList } from 'react-use';
import { InscribingOrderModal } from '@/components/inscribe/InscribingOrderModal';
import {
  removeObjectEmptyValue,
  generteFiles,
  splitRareUtxosByValue,
  generateSeed,
  splitUtxosByValue,
} from '@/lib/inscribe';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { OrderList } from '@/components/inscribe/OrderList';
// import { useCommonStore } from '@/store';
type InscribeType = 'text' | 'brc20' | 'brc100' | 'files' | 'ordx';

export default function InscribeModal() {
  const params = useSearchParams();
  const paramsType = (params.get('type') as string) || 'ordx';
  const { t } = useTranslation();
  const [discount, setDiscount] = useState(0);
  const [metadata, setMetadata] = useState<any>({});
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState<any>(paramsType);
  const [files, setFiles] = useState<any[]>([]);
  const [orderId, setOrderId] = useState<string>();
  const [modalShow, setModalShow] = useState(false);
  const [list, { set: setList, clear: clearList, removeAt }] = useList<any>([
    // {
    //   type: 'brc20_transfer',
    //   name: 'well_0',
    //   value: JSON.stringify({
    //     p: 'brc-20',
    //     op: 'transfer',
    //     tick: 'well',
    //     amt: '10000',
    //   }),
    // },
    // {
    //   type: 'text',
    //   value: 'well4',
    // },
  ]);
  const [ordxData, { set: setOrd2Data, reset: resetOrdx }] = useMap<any>({
    type: 'mint',
    tick: '',
    amount: 1,
    repeatMint: 1,
    limitPerMint: 10000,
    block: '',
    relateInscriptionId: '',
    // cn: 0,
    trz: 0,
    des: '',
    rarity: '',
    mintRarity: '',
    selfmint: '',
    max: '',
    file: '',
    fileName: '',
    fileType: '',
    rarityChecked: false,
    regChecked: false,
    blockChecked: false,
    cnChecked: false,
    trzChecked: false,
    utxos: [],
    isSpecial: false,
  });
  const [brc20Data, { set: setBrc20 }] = useMap({
    type: 'mint',
    tick: '',
    amount: 1,
    repeatMint: 1,
    limitPerMint: 1,
    totalSupply: 21000000,
  });
  const [textData, { set: setTextData, reset: resetText }] = useMap({
    type: 'single',
    text: '',
    utxos: [],
  });
  const [nameData, { set: setNameData, reset: resetName }] = useMap<any>({
    type: 'mint',
    name: '',
    names: [],
    suffix: '.ordx',
  });
  const brc20Change = (data: any) => {
    setBrc20('type', data.type);
    setBrc20('tick', data.tick);
    setBrc20('amount', data.amount);
    setBrc20('repeatMint', data.repeatMint);
    setBrc20('limitPerMint', data.limitPerMint);
    setBrc20('totalSupply', data.totalSupply);
  };
  const ordxNameChange = (data: any) => {
    setNameData('type', data.type);
    setNameData('name', data.name);
    setNameData('names', data.names);
    setNameData('suffix', data.suffix);
  };
  const ordxChange = (data: any) => {
    setOrd2Data('type', data.type);
    setOrd2Data('tick', data.tick);
    setOrd2Data('utxos', data.utxos);
    setOrd2Data('amount', data.amount);
    setOrd2Data('selfmint', data.selfmint);
    setOrd2Data('max', data.max);
    setOrd2Data('relateInscriptionId', data.relateInscriptionId);
    setOrd2Data('isSpecial', data.isSpecial);
    setOrd2Data('file', data.file);
    setOrd2Data('fileName', data.fileName);
    setOrd2Data('fileType', data.fileType);
    setOrd2Data('repeatMint', data.repeatMint);
    setOrd2Data('limitPerMint', data.limitPerMint);
    setOrd2Data('block', `${data.block_start}-${data.block_end}`);
    // setOrd2Data('cn', data.cn);
    setOrd2Data('trz', data.trz);
    setOrd2Data('rarity', data.rarity);
    setOrd2Data('des', data.des);
    setOrd2Data('rarityChecked', data.rarityChecked);
    // setOrd2Data('cnChecked', data.cnChecked);
    setOrd2Data('trzChecked', data.trzChecked);
    setOrd2Data('blockChecked', data.blockChecked);
  };

  const brc20Next = async () => {
    const list: any = [];
    if (brc20Data.type === 'mint') {
      for (let i = 0; i < brc20Data.repeatMint; i++) {
        list.push({
          type: 'brc20',
          name: `mint_${i}`,
          value: JSON.stringify({
            p: 'brc-20',
            op: 'mint',
            tick: brc20Data.tick.toString(),
            amt: brc20Data.amount.toString(),
          }),
        });
      }
    } else if (brc20Data.type === 'deploy') {
      list.push({
        type: 'brc20',
        name: 'deploy_0',
        value: JSON.stringify({
          p: 'brc-20',
          op: 'deploy',
          tick: brc20Data.tick.toString(),
          max: brc20Data.totalSupply.toString(),
          lim: brc20Data.limitPerMint.toString(),
        }),
      });
    } else if (brc20Data.type === 'transfer') {
      list.push({
        type: 'brc20',
        name: 'transfer_0',
        value: JSON.stringify({
          p: 'brc-20',
          op: 'transfer',
          tick: brc20Data.tick.toString(),
          amt: brc20Data.amount.toString(),
        }),
      });
    }
    const _files = await generteFiles(list);
    setList(_files);
    setStep(2);
  };
  const findSepiceAmt = () => {
    const { utxos, amount } = ordxData;
    const userAmt = amount || 0;
    const realAmt = Math.max(userAmt, 330);
    const findBetweenByValue = (userAmt: number, realAmt, ranges: any[]) => {
      let outAmt = 0;
      let outValue = 0;
      let preTotalSize = 0;
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        outValue += range.size;
        if (userAmt > outValue) {
          preTotalSize += range.size;
        }
        if (userAmt <= outValue) {
          const dis = userAmt - preTotalSize;
          outAmt = range.offset + dis;
          break;
        }
      }
      if (outAmt < realAmt) {
        outAmt += realAmt - outAmt;
      }
      return outAmt;
    };
    return findBetweenByValue(userAmt, realAmt, ordxData.utxos[0].sats);
  };
  const ordxNameNext = async () => {
    const list: any = [];
    const { names } = nameData;
    if (nameData.type === 'mint') {
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const _name = name.toString().trim();
        list.push({
          type: 'ordx_name',
          name: `mint`,
          amount: 330,
          offset: 330 * i,
          value: _name,
        });
      }
    }
    setMetadata({
      type: 'name',
    });
    const _files = await generteFiles(list);
    setList(_files);
    setStep(2);
  };
  const ordxNext = async () => {
    const list: any = [];
    let hasDeployFile = false;
    let specialOffsetAmount = 0;
    if (ordxData.type === 'mint') {
      let offset = 0;
      let rangesArr: any[][] = [];
      let amount = Math.max(ordxData.amount, 330);
      if (ordxData.utxos?.length) {
        if (ordxData.isSpecial) {
          rangesArr = splitRareUtxosByValue(ordxData.utxos, amount);
        } else {
          rangesArr = splitUtxosByValue(
            ordxData.utxos,
            amount,
            ordxData.repeatMint,
          );
        }
      }
      console.log('rangesArr', rangesArr);

      for (let i = 0; i < ordxData.repeatMint; i++) {
        const attrArr: string[] = [];
        let amt = ordxData.amount;
        if (ordxData.rarity && ordxData.rarity !== 'common') {
          attrArr.push(`rar=${ordxData.rarity}`);
        }
        if (ordxData.trz > 0) {
          attrArr.push(`trz=${ordxData.trz}`);
        }
        let attr;
        if (attrArr.length) {
          attr = attrArr.join(';');
        }
        let ordxValue: any[] = [
          JSON.stringify(
            removeObjectEmptyValue({
              p: 'ordx',
              op: 'mint',
              tick: ordxData.tick.toString().trim(),
              amt: amt.toString(),
            }),
          ),
        ];

        if (rangesArr[i] && ordxData.isSpecial) {
          amt = rangesArr[i].reduce((acc, cur) => acc + cur.size, 0);
          console.log('amt', amt);

          const len = rangesArr[i].length;
          if (i === 0) {
            amount = rangesArr[i][len - 1].offset + rangesArr[i][len - 1].size;
            if (rangesArr[i][0].offset >= 330) {
              specialOffsetAmount = rangesArr[i][0].offset;
              amount -= specialOffsetAmount;
            }
          } else if (len === 1) {
            amount = rangesArr[i][0].size;
          } else {
            amount =
              rangesArr[i][len - 1].offset -
              rangesArr[i][0].offset +
              rangesArr[i][len - 1].size;
          }

          // if (len === 1) {
          //   amount =
          //     i === 0
          //       ? rangesArr[i][0].offset + rangesArr[i][0].size
          //       : rangesArr[i][0].size;
          // } else {
          //   throw new Error('not support multi utxos');
          // }
          amount = Math.max(amount, 330);
          console.log('amount', amount);
          offset = rangesArr[i][0].offset;
        }
        if (ordxData.relateInscriptionId) {
          console.log('rangesArr', rangesArr[i]);

          const seed = generateSeed(rangesArr[i]);
          ordxValue = [
            JSON.stringify(
              removeObjectEmptyValue({
                p: 'ordx',
                op: 'mint',
                tick: ordxData.tick.toString().trim(),
                amt: amt.toString(),
                desc: `seed=${seed}`,
              }),
            ),
            {
              type: 'relateInscriptionId',
              name: 'relateInscriptionId',
              value: ordxData.relateInscriptionId,
            },
          ];
        }
        list.push({
          type: 'ordx',
          name: `mint_${i}`,
          ordxType: 'mint',
          amount,
          offset,
          isSpecial: ordxData.isSpecial,
          value: ordxValue,
        });
        offset += amount;
      }
    } else if (ordxData.type === 'deploy') {
      const attrArr: string[] = [];
      if (ordxData.rarityChecked && ordxData.rarity) {
        attrArr.push(`rar=${ordxData.rarity}`);
      }
      if (ordxData.trzChecked && ordxData.trz) {
        attrArr.push(`trz=${ordxData.trz}`);
      }
      let attr;
      if (attrArr.length) {
        attr = attrArr.join(';');
      }
      const value: any[] = [
        JSON.stringify(
          removeObjectEmptyValue({
            p: 'ordx',
            op: 'deploy',
            tick: ordxData.tick.toString().trim(),
            max: !ordxData.max ? undefined : ordxData.max,
            selfmint:
              !ordxData.selfmint || ordxData.selfmint === '0'
                ? undefined
                : `${ordxData.selfmint}%`,
            block: ordxData.blockChecked
              ? ordxData.block.toString()
              : undefined,
            lim: ordxData.limitPerMint.toString(),
            attr,
            des: ordxData.des.toString(),
          }),
        ),
      ];
      if (ordxData.file) {
        hasDeployFile = true;
        value.push({
          type: 'file',
          name: ordxData.fileName,
          value: ordxData.file,
          mimeType: ordxData.fileType,
        });
      }
      list.push({
        type: 'ordx',
        amount: 330,
        name: 'deploy_0',
        ordxType: 'deploy',
        value,
      });
    }
    setMetadata({
      type: list[0].type,
      hasDeployFile,
      tick: ordxData.tick,
      ordxType: list[0].ordxType,
      isSpecial: list[0].isSpecial,
      specialOffsetAmount,
      utxos: ordxData.utxos,
    });
    console.log('specialOffsetAmount', specialOffsetAmount);
    if (specialOffsetAmount > 0) {
      list.forEach((v) => {
        v.offset = v.offset - specialOffsetAmount;
      });
    }
    const _files = await generteFiles(list);
    console.log(_files);
    setList(_files);
    setStep(2);
  };
  const textNext = async () => {
    const list: any = [];
    if (textData.type === 'single') {
      list.push({
        type: 'text',
        amount: 330,
        value: textData.text,
        offset: 0,
      });
    } else {
      const lines = textData.text
        .split('\n')
        .map((a) => a.trim())
        .filter((v) => !!v);
      lines.forEach((line: string, i) => {
        list.push({
          type: 'text',
          value: line,
          amount: 330,
          offset: 330 * i,
        });
      });
    }
    const _files = await generteFiles(list);
    console.log(textData.utxos);
    setMetadata({
      type: 'text',
      utxos: textData.utxos,
    });
    setList(_files);
    setStep(2);
  };
  const textChange = (data: any) => {
    setTextData('type', data.type);
    setTextData('text', data.text);
    setTextData('utxos', data.utxos);
  };
  const filesChange = async (files: any[]) => {
    const list = files.map((file) => ({
      type: 'file',
      name: file.name,
      amount: 330,
      value: file,
    }));
    const _files = await generteFiles(list);
    setList(_files);
    setStep(3);
  };
  const filesNext = () => {
    const list: any = [];
    files.forEach((file) => {
      list.push({
        type: 'file',
        name: file.name,
        value: file,
      });
    });
    console.log(list);
    // setList(list);
    // setStep(2);
  };
  const stepTwoNext = () => {
    setStep(3);
  };
  const stepTwoBack = () => {
    setStep(1);
  };
  const handleTabsChange = (e: any) => {
    const value = e.target.value;
    if (tab !== value) {
      console.log(history);
      history.replaceState(undefined, '');
      setTab(value);
      clearList();
    }
  };
  const onItemRemove = async (index: number) => {
    await removeAt(index);
  };
  const onOrderClick = (item) => {
    // if (['pending', 'paid'].includes(item.status)) {
    setOrderId(item.orderId);
    setModalShow(true);
    // }
  };
  const onAddOrder = (item) => {
    setOrderId(item.orderId);
    setModalShow(true);
  };
  const onModalClose = () => {
    setOrderId(undefined);
    setModalShow(false);
  };
  const onFinished = () => {
    clear();
  };
  const onRemoveAll = () => {
    clear();
  };
  const clear = () => {
    clearList();
    resetText();
    resetName();
    resetOrdx();
    setMetadata({});
  };
  useEffect(() => {
    if (list.length === 0) {
      setStep(1);
      resetText();
      resetName();
      resetOrdx();
      setMetadata({});
    }
  }, [list]);

  const tabList = [
    {
      key: 'ordx',
      label: 'Ticker',
    },
    {
      key: 'name',
      label: t('pages.inscribe.name.title'),
    },
    {
      key: 'text',
      label: t('pages.inscribe.text.name'),
    },

    {
      key: 'files',
      label: t('pages.inscribe.files.name'),
    },
  ];
  const onDiscount = (d) => {
    setDiscount(d);
  };
  // useEffect(() => {
  //   if (state?.type) {
  //     setTab(state.type);
  //   }
  // }, [state]);
  return (
    <div className="py-4">
      <div className="flex flex-col max-w-[48rem] mx-auto pt-8">
        {/* <h1 className="text-lg font-bold text-center mb-4">
          {t('pages.inscribe.title')}
        </h1> */}
        <div className="">
          <div className="flex justify-center mb-4">
            <ButtonGroup>
              {tabList.map((item) => (
                <Button
                  key={item.key}
                  color={tab === item.key ? 'primary' : 'default'}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <Card className="mb-4">
            <CardBody>
              {step === 1 && (
                <>
                  {tab === 'files' && (
                    <InscribeFiles onNext={filesNext} onChange={filesChange} />
                  )}
                  {tab === 'text' && (
                    <InscribeText onNext={textNext} onChange={textChange} />
                  )}
                  {tab === 'ordx' && (
                    <InscribeOrdx onChange={ordxChange} onNext={ordxNext} />
                  )}
                  {tab === 'name' && (
                    <InscribeOrdxName
                      onChange={ordxNameChange}
                      onNext={ordxNameNext}
                    />
                  )}
                </>
              )}
              {step === 2 && (
                <InscribeStepTwo
                  list={list}
                  type={tab}
                  metadata={metadata}
                  onBack={stepTwoBack}
                  onNext={stepTwoNext}
                  onDiscount={onDiscount}
                />
              )}
              {step === 3 && (
                <InscribeStepThree
                  metadata={metadata}
                  discount={discount}
                  onItemRemove={onItemRemove}
                  onRemoveAll={onRemoveAll}
                  onAddOrder={onAddOrder}
                  list={list}
                  type={tab}
                />
              )}
            </CardBody>
          </Card>
          <div>
            <OrderList onOrderClick={onOrderClick} />
          </div>
        </div>
        {orderId && (
          <InscribingOrderModal
            show={modalShow}
            orderId={orderId}
            onFinished={onFinished}
            onClose={onModalClose}
          />
        )}
      </div>
    </div>
  );
}
