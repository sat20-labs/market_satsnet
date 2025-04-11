'use client';
import { Button } from '@nextui-org/react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface WalletConnectBusProps {
  children: React.ReactNode;
  className?: string;
  text?: string;
  keepStyle?: boolean;
}
export const WalletConnectBus = ({
  children,
  className,
  text,
  keepStyle,
}: WalletConnectBusProps) => {
  const buttonCLick = (children as any)?.props?.onClick;
  // if (keepStyle) {
  //   (children as any)?.props?.onClick = async () => {

  //   }
  // }
  const { t } = useTranslation();
  const { connected, setModalVisible } = useReactWalletStore((state) => state);
  return connected || keepStyle ? (
    <>{children}</>
  ) : (
    <>
      <Button
        // fullWidth
        variant="ghost"
        size="md"
        onClick={() => setModalVisible(true)}
        radius="sm"
        className={className}
        color="primary"
      >
        {text || t('buttons.connect')}
      </Button>
    </>
  );
};
