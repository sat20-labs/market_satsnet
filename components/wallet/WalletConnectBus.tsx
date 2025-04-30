'use client';
import { Button } from '@/components/ui/button';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface WalletConnectBusProps {
  children: React.ReactNode;
  className?: string;
  text?: string;
  asChild?: boolean;
}

export const WalletConnectBus = ({
  children,
  className,
  text,
  asChild,
}: WalletConnectBusProps) => {
  const { t } = useTranslation();
  const { connected, setModalVisible } = useReactWalletStore((state) => state);

  const handleConnectClick = (event: React.MouseEvent<any>) => {
    // Prevent default behavior if it's wrapping a link, for example.
    // event.preventDefault(); // Optional: uncomment if needed
    setModalVisible(true);
  };

  if (connected) {
    return <>{children}</>;
  }

  if (asChild) {
    if (React.Children.count(children) !== 1 || !React.isValidElement(children)) {
      console.warn(
        'WalletConnectBus: The `asChild` prop requires a single valid React element child.'
      );
      // Fallback or throw error if necessary, returning null for now
      return null;
    }

    const child = children as React.ReactElement<any>; // Type assertion

    // 替换child的内容为"Connect Wallet"，保持原有props
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent<any>) => {
        handleConnectClick(e); // Call our connect logic
        child.props.onClick?.(e); // Call original onClick if it exists
      },
      // Merge className if provided to the wrapper
      className: className ? `${child.props.className || ''} ${className}`.trim() : child.props.className,
      children: text || t('buttons.connect')
    });
  }

  // Default case: not connected and not asChild
  return (
    <Button onClick={() => setModalVisible(true)} className={className}>
      {text || t('buttons.connect')}
    </Button>
  );
};
