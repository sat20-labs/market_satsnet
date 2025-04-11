import { Spinner } from '@nextui-org/react';
import { use, useRef, useState } from 'react';
import { useEffect, useMemo } from 'react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { generateOrdUrl } from '@/lib/utils';

interface OrdinalsNftConentProps {
  inscriptionId?: string;
}
export function OrdinalsNftConent({ inscriptionId }: OrdinalsNftConentProps) {
  const { network } = useReactWalletStore();
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const onLoad = () => {
    setTimeout(() => {
      setLoaded(true);
    }, 1000);
  };
  const onError = () => {
    setLoaded(true);
  };
  const showSpinner = useMemo(() => {
    return !loaded;
  }, [loaded]);
  const contentSrc = useMemo(() => {
    if (inscriptionId) {
      return generateOrdUrl({
        network,
        path: `content/${inscriptionId}`,
      });
    } else {
      return undefined;
    }
  }, [network, inscriptionId]);
  return (
    <div className="h-full w-full">
      {showSpinner && (
        <div className="absolute top-0 left-0 w-full h-full dark:bg-gray-800 z-[1] bg-gray-100 flex justify-center items-center">
          <Spinner />
        </div>
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
