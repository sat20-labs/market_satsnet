import useSWRMutation from 'swr/mutation';
import { ordx } from '@/api';
import { Spinner, Image } from '@nextui-org/react';
import { chain, tryit } from 'radash';
import { use, useRef, useState } from 'react';
import { useEffect, useMemo } from 'react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { generateOrdUrl } from '@/lib/utils';
import { generateSeed } from '@/lib/utils';
import { useCommonStore } from '@/store';

interface UtxoContentProps {
  inscriptionId: string;
  utxo?: string;
  ranges?: any[];
  delay?: number;
  defaultImage?: string;
}
export function UtxoContent({
  inscriptionId,
  utxo,
  delay = 0,
  defaultImage,
}: UtxoContentProps) {
  const { network } = useReactWalletStore();
  const [seed, setSeed] = useState('');
  const timer = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  // const [delayLoading, setDelayLoading] = useState(true);
  const { chain } = useCommonStore();
  const getSeedByUtxo = async () => {
    setLoading(true);
    // 检查 sessionStorage 中是否已经存在 seed
    const key = `utxo-content-seed-${chain}-${network}-${utxo}`;
    const cachedSeed = sessionStorage.getItem(key);
    if (cachedSeed) {
      setSeed(cachedSeed);
      return;
    }

    const [error, res] = await tryit(ordx.getSeedByUtxo)({
      utxo: utxo,
      network,
    });
    if (error) {
      console.error(error);
    } else {
      console.log(res);
      const seed = res?.data?.[0]?.seed;
      if (seed) {
        setSeed(seed);
        // 将 seed 存储在 sessionStorage 中
        sessionStorage.setItem(key, seed);
      }
    }
    setLoading(false);
  };
  // useEffect(() => {
  //   console.log('delay,', delay);
  //   if (delay && delay > 0) {
  //     setDelayLoading(true);
  //     timer.current = setTimeout(() => {
  //       setDelayLoading(false);
  //     }, delay);
  //   } else {
  //     setDelayLoading(false);
  //   }
  //   return () => {
  //     if (timer.current) {
  //       clearTimeout(timer.current);
  //     }
  //   };
  // }, []);
  const onLoad = () => {
    setTimeout(() => {
      setLoaded(true);
    }, 1500);
  };
  const onError = () => {
    setLoaded(true);
  };
  const showSpinner = useMemo(() => {
    return !loaded;
  }, [loaded]);
  // const seed = useMemo(() => data?.data?.[0]?.seed, [data]);
  // const seed = useMemo(
  //   () => (ranges.length > 0 ? generateSeed(ranges) : 0),
  //   [ranges],
  // );
  const contentSrc = useMemo(() => {
    if (inscriptionId && seed) {
      return generateOrdUrl({
        network,
        path: `preview/${inscriptionId}?seed=${seed}`,
      });
    } else {
      return undefined;
    }
  }, [network, inscriptionId, seed]);
  useEffect(() => {
    if (utxo && network) {
      getSeedByUtxo();
    }
  }, [utxo, network]);

  return (
    <div className="h-full w-full">
      {showSpinner && (
        <>
          {!!defaultImage ? (
            <div className="absolute top-0 left-0 w-full h-full z-[1] flex justify-center items-center backdrop-blur-lg bg-black bg-opacity-70">
              <Image
                radius="full"
                src={defaultImage}
                alt="loading image"
                classNames={{ wrapper: 'w-1/2' }}
              />
            </div>
          ) : (
            <div className="absolute top-0 left-0 w-full h-full dark:bg-gray-800 z-[1] bg-gray-100 flex justify-center items-center">
              <Spinner />
            </div>
          )}
        </>
      )}
      {contentSrc && (
        <iframe
          onLoad={onLoad}
          onError={onError}
          src={contentSrc}
          className="pointer-events-none max-w-full h-full max-h-full"
        ></iframe>
      )}
    </div>
  );
}
