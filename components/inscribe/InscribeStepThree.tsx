import {
  Tabs,
  Tab,
  Button,
  Input,
  Textarea,
  Checkbox,
} from '@nextui-org/react';
import { networks, Signer as BTCSigner } from 'bitcoinjs-lib';
import { Address, Signer, Tap, Tx, Script } from '@cmdcode/tapscript';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useMap } from 'react-use';
import { InscribeRemoveItem } from './InscribeRemoveItem';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { isTaprootAddress } from '@/lib/wallet';
import { v4 as uuidV4 } from 'uuid';
import { FeeShow } from './FeeShow';
import { generatePrivateKey, generateInscription } from '@/lib/inscribe';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { WIFWallet, createWifPrivateKey, toXOnly } from '@/lib/inscribe/WIFWallet';
import { bitcoin } from '@/lib/wallet';
import { notification } from 'antd';
import { inscribeOrderHistory } from '@/lib/storage';
import { tryit } from 'radash';
import { useTranslation } from 'react-i18next';
import { Runestone, Rune, Terms, none, Etching, some, RuneId, EtchInscription, Range } from 'runelib';
import { useCommonStore, useOrderStore, OrderItemType } from '@/store';

const DEFAULT_FEE_OBJ = {
  networkFee: 0,
  serviceFee: 0,
  totalFee: 0,
  discountServiceFee: 0,
  totalInscriptionSize: 0,
};

interface Brc20SetpOneProps {
  list: any[];
  type: any;
  discount: number;
  metadata: any;
  ordxUtxo?: any;
  onItemRemove?: (index: number) => void;
  onRemoveAll?: () => void;
  onAddOrder?: (order: OrderItemType) => void;
}

export const InscribeStepThree = ({
  list,
  type,
  ordxUtxo,
  onItemRemove,
  metadata,
  discount,
  onAddOrder,
  onRemoveAll,
}: Brc20SetpOneProps) => {
  const { t } = useTranslation();
  const { feeRate, btcHeight, runtimeEnv } = useCommonStore((state) => state);
  const [errText, setErrText] = useState('');
  const {
    network,
    address: currentAccount,
    btcWallet,
    connector,
  } = useReactWalletStore();
  const [data, { set }] = useMap({
    toSingleAddress: currentAccount,
    toMultipleAddresses: '',
  });
  const [loading, setLoading] = useState(false);
  const { add: addOrder } = useOrderStore((state) => state);
  const [selected, setSelected] = useState(false);
  const [tightSelected, setTightSelected] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('single');

  const files = useMemo(() => list, [list]);
  const oneUtxo = useMemo(() => selected, [selected]);

  const checkToAddressIsTaproot = useCallback(
    (address: string[]) => {
      for (const addr of address) {
        if (!isTaprootAddress(addr, network)) {
          setErrText(t('pages.inscribe.step_three.error_3'));
          return false;
        }
      }
      return true;
    },
    [network, t],
  );

  const toAddressList = useMemo(() => {
    if (selectedTab === 'single') {
      return [data.toSingleAddress];
    } else {
      return data.toMultipleAddresses
        .split('\n')
        .map((address) => address.trim())
        .filter((address) => address !== '');
    }
  }, [data.toMultipleAddresses, data.toSingleAddress, selectedTab]);

  const totalInscriptionSize = useMemo(() => {
    if (type === 'rune') {
      return (files.length > 1 ? 2 : 1) * 330;
    }
    return tightSelected
      ? Math.max(330, files.length)
      : files.reduce((acc, cur) => acc + cur.amount, 0);
  }, [files, tightSelected, type]);

  const submit = async () => {
    if (loading) return;
    setErrText('');
    const feeObj = { ...DEFAULT_FEE_OBJ };
    const secret = generatePrivateKey();
    let inscription;
    let _discount = discount;
    let _files: any[] = [];
    let _opReturnScript;
    const runeMetadata: any = {};
    const wifPrivateKey = createWifPrivateKey(network);

    if (type === 'rune' && metadata.action === 'mint') {
      _files = files;
      const runeId = metadata.runeId;
      const runeIdArr = runeId.split(':');
      
      const runestone = new Runestone(
        [],
        none(),
        some(new RuneId(Number(runeIdArr[0]), Number(runeIdArr[1]))),
        some(Number(metadata.amount)),
      );
      _opReturnScript = runestone.encipher().toString('hex');
      const opSize = Math.ceil(_opReturnScript.length / 2);

      const txsize = 64 + 33 + opSize;
      const txHeaderSize = 12;
      const inputSize = 41;
      const outputSize = 52;
      const witnessSize = txsize;
      const numInputs = 1;

      const strippedSize =
        txHeaderSize + inputSize * numInputs + outputSize * 2;
      const totalWeight = strippedSize * 4 + witnessSize * numInputs;
      const vSize = totalWeight / 4;
      console.log('vSize', vSize);
      
      const oneNetwork = Math.ceil(vSize * feeRate.value);
      feeObj.networkFee = (files.length - 1) * oneNetwork;
      if (files.length === 1) {
        feeObj.networkFee = 0;
      }
      let totalFee = feeObj.networkFee + totalInscriptionSize;
      const oneFee = 1000 + Math.ceil(totalInscriptionSize * 0.01);
      if (metadata.type === 'name' && btcHeight <= 856000) {
        _discount = 100;
      }
      if (runtimeEnv === 'dev') {
        _discount = 100;
      }
      feeObj.serviceFee = Math.ceil(oneFee);
      feeObj.discountServiceFee = Math.ceil((oneFee * (100 - _discount)) / 100);
      feeObj.totalInscriptionSize = totalInscriptionSize;
      feeObj.totalFee = totalFee;
     
      
      const runeWallet = new WIFWallet({ network, privateKey: wifPrivateKey });
      runeMetadata.address = runeWallet.address;
      runeMetadata.oneNetworkFee = oneNetwork;
      runeMetadata.publicKey = runeWallet.ecPair.publicKey.toString('hex');
    } else if (type === 'rune' && metadata.action === 'etch') {
      const runeWallet = new WIFWallet({ network, privateKey: wifPrivateKey });
      runeMetadata.address = runeWallet.address;
      runeMetadata.publicKey = runeWallet.ecPair.publicKey;
      _files = files;
      const etchRunes = _files[0];
      const ins = new EtchInscription();
      const bitcoinNetwork = network === 'mainnet'
              ? networks.bitcoin
              : networks.testnet;
      // ins.setContent('text/plain', Buffer.from('test runes', 'utf-8'));
      ins.setRune(etchRunes.runeName);

      const etching_script_asm = `${toXOnly(runeMetadata.publicKey).toString('hex')} OP_CHECKSIG`;
      bitcoin.script.fromASM(etching_script_asm);
      const etching_script = Buffer.concat([
        bitcoin.script.fromASM(etching_script_asm) as any,
        ins.encipher(),
      ]);

      const scriptTree: any = {
        output: etching_script,
      };

      

      const etching_redeem = {
        output: etching_script,
        redeemVersion: 192,
      };
      const script_p2tr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(runeMetadata.publicKey),
        scriptTree,
        network: bitcoinNetwork,
      });
      const etching_p2tr = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(runeMetadata.publicKey),
        scriptTree,
        redeem: etching_redeem,
        network: bitcoinNetwork,
      });
      console.log('etching_script', etching_script);
      console.log('etching_p2tr', etching_p2tr);
      console.log('etching_redeem', etching_redeem);
      const address = script_p2tr.address ?? "";
      inscription = {
        address,
        redeemVersion: etching_redeem.redeemVersion,
        p2tr_script: script_p2tr.output!.toString('hex'),
        script: etching_redeem.output.toString('hex'),
        cb: etching_p2tr.witness![etching_p2tr.witness!.length - 1].toString('hex'),
        amount: 0,
        network: network,
      }
      const rune = Rune.fromName(etchRunes.runeName);
      const terms = new Terms(Number(etchRunes.amount), Number(etchRunes.cap), new Range(none(), none()), new Range(none(), none()))
      console.log('etchRunes', etchRunes);
      
      const etching = new Etching(some(Number(etchRunes.divisibility)), some(Number(etchRunes.premine)), some(rune), none(), some(etchRunes.symbol), some(terms), true);
  
      const stone = new Runestone([], some(etching), none(), none());
      _opReturnScript = stone.encipher().toString('hex');
      console.log('opReturnScript', _opReturnScript);
      
      const txsize = 64 + 33 + etching_script.length;
      const txHeaderSize = 12;
      const inputSize = 41;
      const outputSize = 52;
      const witnessSize = txsize;
      const numInputs = 1;

      const strippedSize =
        txHeaderSize + inputSize * numInputs + outputSize * 2;
      const totalWeight = strippedSize * 4 + witnessSize * numInputs;
      const vSize = totalWeight / 4;
      console.log('vSize', vSize);
      
      feeObj.networkFee = Math.ceil((vSize + 30) * feeRate.value);
      let totalFee = feeObj.networkFee + totalInscriptionSize;
      console.log('totalFee', totalFee);
      
      const oneFee = 1000 + Math.ceil(totalInscriptionSize * 0.01);
      if (metadata.type === 'name' && btcHeight <= 856000) {
        _discount = 100;
      }
      if (runtimeEnv === 'dev') {
        _discount = 100;
      }
      feeObj.serviceFee = Math.ceil(oneFee);
      feeObj.discountServiceFee = Math.ceil((oneFee * (100 - _discount)) / 100);
      feeObj.totalInscriptionSize = totalInscriptionSize;
      feeObj.totalFee = totalFee;
    } else {
      _files = files.map((f, i) => ({
        ...f,
        amount: tightSelected ? 1 : f.amount,
        offset: tightSelected ? i : f.offset,
      }));
      inscription = generateInscription({
        metadata,
        secret,
        files: _files,
        network,
        feeRate: feeRate.value,
      });
      const outputLength = oneUtxo || tightSelected ? 1 : files.length;
      const txHeaderSize = 12;
      const inputSize = 41;
      const outputSize = 52;
      const witnessSize = inscription.txsize;
      const numInputs = 1;

      const strippedSize =
        txHeaderSize + inputSize * numInputs + outputSize * outputLength;
      const totalWeight = strippedSize * 4 + witnessSize * numInputs;
      const vSize = totalWeight / 4;
      feeObj.networkFee = Math.ceil(vSize * feeRate.value);
      let totalFee = feeObj.networkFee + totalInscriptionSize;
      const oneFee = 1000 + Math.ceil(totalInscriptionSize * 0.01);
      if (metadata.type === 'name' && btcHeight <= 856000) {
        _discount = 100;
      }
      feeObj.serviceFee = Math.ceil(oneFee);
      feeObj.discountServiceFee = Math.ceil((oneFee * (100 - _discount)) / 100);
      feeObj.totalInscriptionSize = totalInscriptionSize;
      feeObj.totalFee = totalFee;
    }

    const orderId = uuidV4();
    const toAddresses = toAddressList;
    if (toAddresses.length === 0) {
      setErrText(t('pages.inscribe.step_three.error_1'));
      return;
    }
    if (
      !oneUtxo &&
      toAddresses.length > 1 &&
      toAddresses.length !== files.length
    ) {
      setErrText(t('pages.inscribe.step_three.error_2'));
      return;
    }
    if (!checkToAddressIsTaproot(toAddresses)) {
      return;
    }

    const order: OrderItemType = {
      orderId,
      type,
      inscription,
      secret,
      wifPrivateKey,
      oneUtxo,
      runeMetadata,
      opReturnScript: _opReturnScript,
      tight: tightSelected,
      discount: _discount,
      fee: feeObj,
      metadata,
      toAddress: toAddresses,
      feeRate: feeRate.value,
      files: _files,
      network,
      status: 'pending',
      createAt: Date.now().valueOf(),
    };

    const [err] = await tryit(inscribeOrderHistory.addItem)(order);
    if (err) {
      notification.error({
        message: t('pages.inscribe.step_three.error_5'),
        description: err.message,
      });
      return;
    }
    addOrder(order);
    onAddOrder?.(order);
  };

  const showTight = useMemo(
    () => ['localhost', 'test'].some((n) => location.hostname.indexOf(n) > -1),
    [],
  );
  const calcHex = useCallback(
    (file: any) =>
      file.fileHex
        ? file.hex + file.fileHex
        : file.parent
          ? file.hex + file.parent
          : file.hex,
    [],
  );
  const cycleFill = useCallback(() => {
    const addresses = data.toMultipleAddresses;
    const addressList = addresses
      .split('\n')
      .map((address) => address.trim())
      .filter((a) => a !== '');
    const len = list.length || 10;
    const newAddressList: string[] = [];
    if (addressList.length < len) {
      for (let i = 0; i < len; i++) {
        newAddressList.push(addressList[i % addressList.length]);
      }
      set('toMultipleAddresses', newAddressList.join('\n'));
    }
  }, [data.toMultipleAddresses, list.length, set]);

  useEffect(() => {
    if (currentAccount) {
      set('toSingleAddress', currentAccount);
    }
  }, [currentAccount, set]);

  return (
    <div>
      <div className="text-lg font-bold flex justify-between mb-2">
        <span>
          {list.length} {t('pages.inscribe.step_three.items')}
        </span>
        <Button size="sm" onClick={onRemoveAll}>
          {t('buttons.remove_all')}
        </Button>
      </div>
      <div className="max-h-[30rem] overflow-y-auto p-4 bg-gray-800 rounded-xl mb-4">
        <div className="w-full py-4 flex flex-col gap-2">
          {list.map((item, index) => (
            <InscribeRemoveItem
              key={index}
              onRemove={() => onItemRemove?.(index)}
              label={index + 1}
              hex={calcHex(item)}
              value={item.show}
            />
          ))}
        </div>
      </div>

      <Tabs
        aria-label="address tabs"
        disabledKeys={type === 'rune' ? ['multiple'] : []}
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
      >
        <Tab key="single" title={t('pages.inscribe.step_three.to_single')}>
          <div className="mb-4">
            <Input
              placeholder="Basic usage"
              value={data.toSingleAddress}
              onChange={(e) => set('toSingleAddress', e.target.value)}
            />
          </div>
          {files.length > 1 && showTight && type !== 'rune' && (
            <>
              <div className="mb-4">
                <Checkbox
                  isSelected={selected}
                  onValueChange={(value) => setSelected(value)}
                >
                  {t('pages.inscribe.step_three.output_one_utxo')}
                </Checkbox>
              </div>
              <div className="mb-4">
                <Checkbox
                  isSelected={tightSelected}
                  onValueChange={(value) => setTightSelected(value)}
                >
                  {t('pages.inscribe.step_three.tight_one_utxo')}
                </Checkbox>
              </div>
            </>
          )}
        </Tab>
        <Tab key="multiple" title={t('pages.inscribe.step_three.to_multiple')}>
          <div className="mb-4">
            <div className="mb-2">
              Multiple Address ({toAddressList.length}):
            </div>
            <Textarea
              placeholder="Enter multiple addresses, one per line"
              value={data.toMultipleAddresses}
              onChange={(e) => set('toMultipleAddresses', e.target.value)}
              className="mb-2"
            />
            <div className="flex">
              <Button color={'primary'} onClick={cycleFill}>
                {t('pages.inscribe.step_three.cycle_fill', {
                  len: list.length,
                })}
              </Button>
            </div>
          </div>
        </Tab>
      </Tabs>
      <div className="mb-4">
        <p>{t('pages.inscribe.step_three.address_hint')}</p>
      </div>
      <div>
        <FeeShow
          totalInscriptionSize={totalInscriptionSize}
          feeRate={feeRate.value}
          filesLength={files.length}
        />
      </div>
      {errText && (
        <div className="text-red-500 text-center my-2">{errText}</div>
      )}
      <div className="w-60 mx-auto flex justify-center py-4">
        <WalletConnectBus>
          <Button
            size="md"
            isLoading={loading}
            color="default"
            className='w-full sm:w-60 btn-gradient'
            onClick={submit}
          >
            {t('buttons.submit_payment')}
          </Button>
        </WalletConnectBus>
      </div>
    </div>
  );
};
