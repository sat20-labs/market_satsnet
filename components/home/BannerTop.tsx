// components/BannerTop
import { Button, Image } from '@nextui-org/react';
import React, { useEffect, useMemo } from 'react';
import { ordxSWR } from '@/api';
import { useRouter } from 'next/navigation';
import { thousandSeparator } from '@/lib/utils';
// import CountdownTimer from '@/components/CountdownTimer';
import ProgressBar from '@/components/ProgressBar';

const BannerTop = ({ detail }: any) => {
  const router = useRouter();
  const today = new Date();
  const startDate = new Date('2024-07-23T03:58:00');
  const targetDate = new Date('2024-08-10T00:00:00');
  const { data: heightData } = ordxSWR.useBtcHeight('livenet');
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const toMint = () => {
    router.push('/inscribe?type=name&ticker=');
  };
  const currentBlockHeight = useMemo(() => {
    return heightData?.data.height || 0;
  }, [heightData]);
  const startBlockHeight = 853472;
  const endBlockHeight = 856000;
  return (
    <section className="bg-[#060818] text-white md:py-8 md:px-8 rounded-lg">
      <div className="mx-auto rounded-lg">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <div className="pl-10 md:pl-30 justify-center items-center">
              <div className="mt-1 md:mt-0 mb-4 text-ellipsis text-lg text-orange-500 bg-transparent font-bold">
                {formatDate(today)}
              </div>
              <div>
                <Image
                  radius="full"
                  src="./names-free.png"
                  alt="logo"
                  className="w-1/2 h-1/2 p-1 rounded-full"
                />
              </div>
              {/* <h2 className="text-3xl md:text-7xl font-bold mb-4 mt-14">
                🔥 Names is now <br />
                <span className="text-blue-500">being free minted!</span>
              </h2> */}
              <div className="mb-8 text-sm md:text-xl text-yellow-400">
                Supports suffixes: for example, .btc, .x, .pizza, and no suffix.
              </div>
              <div>
                <Button
                  className="text-sm font-blod h-12 w-60 md:w-96 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:to-indigo-500 hover:via-purple-500 hover:from-pink-500 uppercase"
                  variant="flat"
                  radius="sm"
                  onClick={toMint}
                >
                  <span className="md:text-2xl">🍕</span> Free Mint
                </Button>
              </div>
            </div>
          </div>
          <div>
            <div className="bg-gray-800/50 p-4  text-xs rounded-lg">
              <div className="text-center">
                <h3 className="text-2xl md:text-4xl font-bold text-primary mb-4 uppercase">
                  Names Free Mint End In
                </h3>
                {/* <CountdownTimer date={targetDate} /> */}
                <div className="mt-8">
                  <div className="flex justify-between mb-2">
                    <h6>
                      <span>{startBlockHeight?.toLocaleString()} </span>
                    </h6>
                    <h6 className="pr-30 keep-all">
                      Current:{' '}
                      <span className="text-green-500">
                        {currentBlockHeight?.toLocaleString()}
                      </span>
                    </h6>
                    <h6>
                      <span>{endBlockHeight?.toLocaleString()} </span>
                    </h6>
                  </div>
                  <ProgressBar
                    start={startBlockHeight}
                    current={currentBlockHeight}
                    target={endBlockHeight}
                    isdisplay={true}
                  />
                  <div className="flex justify-between mt-2">
                    <p className="fs-14">{formatDate(startDate)}</p>
                    <p className="fs-14">
                      {/* <h6 className="pr-30 keep-all">
                        Holders:{' '}
                        <span className="text-green-500">
                          {thousandSeparator(detail?.holdersCount)}
                        </span>{' '}
                        <br />
                        Minted:{' '}
                        <span className="text-green-500">
                          {thousandSeparator(detail?.totalMinted)}
                        </span>
                      </h6> */}
                    </p>
                    <p className="fs-14"> {formatDate(targetDate)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ul className="flex justify-center space-x-4">
                    <li>
                      <a href="#" title="">
                        <span className="icon-bitcoin"> </span>
                      </a>
                    </li>
                    <li>
                      <a href="#" title="">
                        <span className="icon-coinp"></span>
                      </a>
                    </li>
                    <li>
                      <a href="#" title="">
                        <span className="icon-kyber-network"></span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BannerTop;
