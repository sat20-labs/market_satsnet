'use client';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { Icon } from '@iconify/react';
import {
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Button,
  CardFooter,
  Image,
} from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function ToolsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const clickHandler = (item) => {
    const { type, path } = item;
    if (type === 'route') {
      router.push(path);
    }
  };

  const tools = [
    {
      name: 'T',
      icon: 'mdi-light:content-duplicate',
      title: t('pages.tools.transaction.title'),
      desc: t('pages.tools.transaction.description'),
      path: '/tools/transaction',
      type: 'route',
      btnText: t('pages.tools.transaction.btn_split'),
    },
    {
      name: 'R',
      icon: 'mdi-light:magnify',
      title: t('pages.tools.search_sat.title'),
      desc: t('pages.tools.search_sat.description'),
      path: '/tools/sat',
      type: 'route',
      btnText: t('pages.tools.search_sat.btn_search'),
    },
    {
      name: 'S',
      icon: 'mdi-light:share',
      title: '一键转移资产',
      desc: '转移所有铭文资产',
      path: '/tools/transfer',
      type: 'route',
      btnText: t('pages.tools.btc_transfer'),
    },
  ];
  return (
    <div className="min-h-[10rem] grid  grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-4 mt-4 mb-4 pt-2">
      {tools.map((item, i) => (
        <Card className="max-w-[340px] mb-4 ml-4" key={i}>
          <CardHeader className="justify-between">
            <div className="flex gap-5">
              {/*               <Avatar name={item.name} className="text-2xl" /> */}
              {/* <Image
                radius="full"
                src={item.icon}
                alt="logo"
                className="w-20 h-20 p-1 rounded-full bg-gray-950"
              /> */}

              <Icon icon={item.icon} className="w-12 h-12 p-2 text-zinc-400  bg-zinc-800/90 rounded-2xl"/>

              <div className="flex flex-col gap-1 items-start justify-center">
                <h4 className="text-small font-semibold leading-none text-default-600">
                  {item.title}
                </h4>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-3 py-0 text-small justify-center items-center pb-8">
            <div className="flex flex-col gap-1 pt-0 items-start justify-center h-30 md:h-20">
              <p className="text-gray-500 pb-4 tracking-[0.06em]">
                {item.desc}
              </p>
            </div>
            <WalletConnectBus className="mx-auto mt-1 block">
              <Button
                // className="inline-block  border-transparent h-7 tracking-[0.2em] text-small line-clamp-1 py-0 bg-primary-300 rounded-lg shadow-lg font-sans uppercase"
                className="text-tiny md:text-small tracking-[0.22em]  w-2/3 btn-gradient"
                variant="flat"
                radius="sm"
                onClick={() => clickHandler(item)}
              >
                {item.btnText}
              </Button>
            </WalletConnectBus>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
