'use client';

import {
  Radio,
  RadioGroup,
  Input,
  Divider,
  Select,
  SelectItem,
  Slider,
  Button,
  Checkbox,
  Tooltip,
} from '@nextui-org/react';
import type { UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
// import { useLocation } from 'react-router-dom';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Upload, Table, notification } from 'antd';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-use';
import { hideStr, calcTimeBetweenBlocks } from '@/lib/utils';
import { clacTextSize, encodeBase64, base64ToHex } from '@/lib/inscribe';
import { generateMempoolUrl } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ordx, ordxSWR } from '@/api';
import { tryit } from 'radash';
import { useUtxoStore } from '@/store';
import { useCommonStore } from '@/store';
import { ColumnsType } from 'antd/es/table';
import { UtxoSelectTable } from './UtxoSelectTable';
// import { CopyButton } from '@/components/CopyButton';

const { Dragger } = Upload;

interface InscribeOrdxProps {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any; // Add 'value' prop
}

export const InscribeOrdxDeploy = ({ onNext, onChange, value }: InscribeOrdxProps) => {
  const { address: currentAccount, network, connected } = useReactWalletStore();
  const { btcHeight } = useCommonStore((state) => state);
  const { t } = useTranslation();
  // const { state } = useLocation();
  const [time, setTime] = useState({ start: undefined, end: undefined } as any);
  console.log(value);
  
  const [data, { set,  }] = useMap<any>({
    type: 'deploy',
    mode: 'fair',
    tick: '',
    limitPerMint: 10000,
    repeatMint: 1,
    block_start: 0,
    block_end: 0,
    rarity: '',
    trz: 0,
    selfmint: '0',
    max: '',
    file: '',
    relateInscriptionId: '',
    fileName: '',
    fileType: '',
    blockChecked: true,
    rarityChecked: false,
    cnChecked: false,
    trzChecked: false,
    isSpecial: false,
    des: '',
    ...(value || {}), // Initialize with 'value' prop
  });

  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickBlurChecked, setTickBlurChecked] = useState(true);
  const [tickChecked, setTickChecked] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [originFiles, setOriginFiles] = useState<any[]>([]);

  const { data: satTypeData } = ordxSWR.useSatTypes({ network });
  const satTypeList = useMemo(() => {
    return satTypeData?.data || [];
  }, [satTypeData]);

  const filesChange: UploadProps['onChange'] = async ({ fileList }) => {
    const originFiles = fileList.map((f) => f.originFileObj);
    // onChange?.(originFiles);
    const file = originFiles[0];
    if (file) {
      const b64 = (await encodeBase64(file as any)) as string;
      const base64 = b64.substring(b64.indexOf('base64,') + 7);
      const hex = base64ToHex(base64);
      set('file', hex);
      set('fileName', file.name);
      if (file.type) {
        set('fileType', file.type);
      }
      setOriginFiles(originFiles);
      setFiles([]);
    }
  };
  const onFilesRemove = async () => {
    set('file', '');
    set('fileName', '');
    set('fileType', '');
  };
  const getOrdXInfo = async (tick: string) => {
    setLoading(true);
    const [err, info] = await tryit(ordx.getTickDeploy)({
      tick,
      address: currentAccount,
      network,
    });

    if (err) {
      notification.error({
        message: t('notification.system_error'),
      });
      setLoading(false);
      throw err;
    }
    setLoading(false);
    return info;
  };
  const nextHandler = async () => {
    setErrorText('');
    if (!tickChecked) {
      const checkStatus = await checkTick();

      if (!checkStatus) {
        return;
      }

      setTickChecked(true);
    } else {
      setLoading(true);

      setLoading(false);
      onNext?.();
    }
  };
  const checkTick = async () => {
    setErrorText('');
    if (data.tick === undefined || data.tick === '') {
      return false;
    }

    const textSize = clacTextSize(data.tick);
    if (textSize < 3 || textSize == 4 || textSize > 32) {
      setErrorText(t('pages.inscribe.ordx.error_1'));
      return false;
    }
    try {
      const info = await getOrdXInfo(data.tick);

      if (info.code !== 0) {
        setErrorText(t('pages.inscribe.ordx.error_3', { tick: data.tick }));
        return false;
      }
      if (data.blockChecked) {
        if (data.block_start < minBlockStart) {
          setErrorText(
            t('pages.inscribe.ordx.error_9', { block: minBlockStart }),
          );
          return false;
        }
        if (data.block_start >= data.block_end) {
          setErrorText(t('pages.inscribe.ordx.error_10'));
          return false;
        }
      }
      if (data.rarityChecked) {
        if (!data.rarity) {
          setErrorText(t('pages.inscribe.ordx.error_11'));
          return false;
        }
      }
      if (data.max && data.max < data.limitPerMint) {
        setErrorText(t('pages.inscribe.ordx.error_16'));
        return false;
      }
      if (data.mode === 'fair') {
        // if (!(data.blockChecked || data.rarityChecked)) {
        //   setErrorText(t('pages.inscribe.ordx.error_13'));
        //   return false;
        // }
      } else if (data.mode === 'project') {
        if (!data.max) {
          setErrorText(t('pages.inscribe.ordx.error_14'));
          return false;
        }
        // if (
        //   data.selfmint !== '100' &&
        //   !(data.block_start && data.block_end && data.blockChecked)
        // ) {
        //   setErrorText(t('pages.inscribe.ordx.error_15'));
        //   return false;
        // }
      }
      return true;
    } catch (error) {
      console.log('error', error);
      return false;
    }
  };
  const tickChange = async (value: string) => {
    set('tick', value.trim());
  };
  const ontickBlur = async () => {
    setTickBlurChecked(false);
    const cleanValue = data.tick.replace(/[^\w\u4e00-\u9fa5]/g, '');
    set('tick', cleanValue);
    setTickBlurChecked(true);
  };

  const rarityChange = (value: string) => {
    set('rarity', value);
    if (value !== 'common' || !value) {
      set('limitPerMint', 1);
    } else {
      set('limitPerMint', 10000);
    }
  };
  const onBlockChecked = (e: any) => {
    set('blockChecked', e.target.checked);
  };
  const onRarityChecked = (e: any) => {
    set('rarityChecked', e.target.checked);
  };

  const buttonDisabled = useMemo(() => {
    return !data.tick || !tickBlurChecked;
  }, [data, tickBlurChecked]);

  const onBlockBLur = () => {
    calcTimeBetweenBlocks({
      height: btcHeight,
      start: data.block_start,
      end: data.block_end,
      network,
    }).then(setTime);
  };

  const minBlockStart = useMemo(() => {
    return btcHeight + (network === 'testnet' ? 10 : 1010);
  }, [btcHeight]);
  useEffect(() => {
    if (btcHeight) {
      const block_start = btcHeight + (network === 'testnet' ? 10 : 1010);
      const block_end = btcHeight + 4320;
      set('block_start', block_start);
      set('block_end', block_end);

      calcTimeBetweenBlocks({
        height: btcHeight,
        start: block_start,
        end: block_end,
        network,
      }).then(setTime);
    }
  }, [btcHeight]);
  useEffect(() => {
    setTickChecked(false);
    console.log(data);
    
    onChange?.(data);
  }, [data]);
  return (
    <div>
      <div className="flex items-center mb-4">
        <div className="w-20 sm:w-52">
          {t('pages.inscribe.ordx.deploy_mode')}
        </div>
        <RadioGroup
          orientation="horizontal"
          onValueChange={(e) => set('mode', e)}
          value={data.mode}
        >
          <Radio value="fair">
            {t('pages.inscribe.ordx.deploy_mode_fair')}
          </Radio>
          <Radio value="project">
            {t('pages.inscribe.ordx.deploy_mode_project')}
          </Radio>
        </RadioGroup>
      </div>
      <div className="mb-4">
        <div className="flex items-center mb-4">
          <div className="w-20 sm:w-52">{t('common.tick')}</div>
          <Input
            value={data.tick}
            className="flex-1"
            onChange={(e) => {
              tickChange(e.target.value);
            }}
            onBlur={() => {
              ontickBlur();
            }}
            maxLength={32}
            type="text"
            placeholder={t('pages.inscribe.ordx.tick_placeholder')}
          />
        </div>
        <div className="flex items-center mb-4">
          <div className="w-20 sm:w-52">{t('common.max')}</div>
          <Input
            type="number"
            className="flex-1"
            value={data.max?.toString()}
            onChange={(e) => {
              set('max', e.target.value);
            }}
            min={0}
          ></Input>
        </div>
        {data.mode === 'project' && (
          <div className="flex items-center mb-4">
            <div className="w-20 sm:w-52">{t('common.selfmint')}</div>
            <Input
              type="number"
              className="flex-1"
              value={data.selfmint?.toString()}
              onChange={(e) => {
                let value: any = e.target.value;
                if (value) {
                  value = value.replace('.', '');
                  value = parseInt(value);
                  value = Math.min(value, 100);
                  value = Math.max(value, 0);
                }
                set('selfmint', value.toString());
              }}
              endContent="%"
              max={100}
              min={0}
            ></Input>
          </div>
        )}
        <div className="mb-4">
          <div className="flex mb-2 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-52">
              {t('common.block')}{' '}
              <span className="text-xs">
                （
                {t('pages.inscribe.ordx.current_height', {
                  height: btcHeight,
                })}
                ）
              </span>
            </div>
            <div className="flex-1 flex items-center">
              <Checkbox
                isSelected={data.blockChecked}
                onChange={onBlockChecked}
              ></Checkbox>
              <div className="ml-2 flex-1 flex items-center">
                <Input
                  type="number"
                  value={data.block_start.toString()}
                  className="flex-1"
                  onBlur={onBlockBLur}
                  isDisabled={!data.blockChecked}
                  placeholder="Block start"
                  onChange={(e) =>
                    set(
                      'block_start',
                      isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value),
                    )
                  }
                  min={minBlockStart}
                ></Input>
                <Divider className="w-4 mx-4"></Divider>
                <Input
                  type="number"
                  value={data.block_end.toString()}
                  isDisabled={!data.blockChecked}
                  className="flex-1"
                  onBlur={onBlockBLur}
                  placeholder="Block End"
                  onChange={(e) =>
                    set(
                      'block_end',
                      isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value),
                    )
                  }
                  min={minBlockStart}
                ></Input>
              </div>
            </div>
          </div>
          {time.start && time.end && (
            <div className="sm:ml-60 mb-2 text-xs text-gray-600">
              {t('pages.inscribe.ordx.block_helper', {
                start: time.start,
                end: time.end,
              })}
            </div>
          )}
        </div>
        <div className="flex mb-2 flex-col gap-2 sm:flex-row sm:items-center">
          <div className=" sm:w-52">
            {t('common.rarity')}
            <Tooltip
              content={t('pages.inscribe.ordx.rarity_helper')}
              triggerScaleOnOpen={false}
            >
              <span className="text-blue-500">
                (sat
                <QuestionCircleOutlined />)
              </span>
            </Tooltip>
          </div>
          <div className="flex-1 flex items-center">
            <Checkbox
              isSelected={data.rarityChecked}
              onChange={onRarityChecked}
            ></Checkbox>
            <div className="ml-2 flex-1">
              <Select
                disabled={!data.rarityChecked}
                placeholder={t('common.select_option')}
                value={data.rarity}
                onChange={(e) => rarityChange(e.target.value)}
              >
                {satTypeList.map((item) => {
                  return (
                    <SelectItem value={item} key={item}>
                      {item}
                    </SelectItem>
                  );
                })}
              </Select>
            </div>
          </div>
        </div>
        <div className="flex mb-2 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-52">{t('common.limit_per_mint')}</div>
          <div className="flex-1">
            <Input
              type="number"
              value={data.limitPerMint.toString()}
              onChange={(e) =>
                set(
                  'limitPerMint',
                  isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                )
              }
              min={1}
            ></Input>
          </div>
        </div>
        <div className="flex items-center  mb-4">
          <div className="w-20 sm:w-52">{t('common.description')}</div>
          <div className="flex-1">
            <Input
              type="text"
              maxLength={128}
              value={data.des}
              onChange={(e) => set('des', e.target.value)}
            />
          </div>
        </div>
        <div className="flex mb-2 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-52">{t('pages.inscribe.ordx.deploy_file')}</div>
          <div className="flex-1">
            <Dragger
              maxCount={1}
              onRemove={onFilesRemove}
              listType="picture"
              beforeUpload={() => false}
              onChange={filesChange}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="dark:text-white break-all">
                {t('pages.inscribe.files.upload_des_1')}
              </p>
              <p className="dark:text-white break-all">
                {t('pages.inscribe.files.upload_des_2')}
              </p>
            </Dragger>
          </div>
        </div>
      </div>
      <div className="w-60 mx-auto flex justify-center py-4">
        <WalletConnectBus>
          <Button
            isLoading={loading}
            isDisabled={buttonDisabled}
            color="default"
            className="w-full sm:w-60 btn-gradient"
            onClick={nextHandler}
          >
            {tickChecked ? t('buttons.next') : 'Check'}
          </Button>
        </WalletConnectBus>
      </div>
      {errorText && (
        <div className="mt-2 text-xl text-center text-red-500">{errorText}</div>
      )}
    </div>
  );
};
