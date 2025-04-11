import React, { useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Spinner,
  Card,
  CardBody,
  Image,
} from '@nextui-org/react';

import { notification } from 'antd';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useState } from 'react';

interface WalletSelectModalProps {
  visiable: boolean;
  onClose?: () => void;
}
export const WalletSelectModal = ({
  visiable,
  onClose: onModalClose,
}: WalletSelectModalProps) => {
  const { connect, connectors, localConnectorId, init, switchConnector } =
    useReactWalletStore((state) => state);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const connectHander = async (id: any) => {
    switchConnector(id);
    setLoading(true);
    try {
      await connect();
      onModalClose?.();
    } catch (error: any) {
      notification.error({
        message: 'Connect Wallet Failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // init({ defaultConnectorId: 'okx', network: 'livenet' });
  }, []);
  useEffect(() => {
    if (visiable) {
      onOpen();
    } else {
      onClose();
    }
  }, [visiable]);

  return (
    <Modal
      backdrop="blur"
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={onModalClose}
    >
      <ModalContent>
        <ModalHeader className="">Select a wallet to connect</ModalHeader>
        <ModalBody className="pb-4">
          {connectors?.map((item) => (
            <Card
              key={item.name}
              isPressable
              isDisabled={loading}
              onClick={() => connectHander(item.id)}
            >
              <CardBody>
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Image
                      src={item.logo}
                      alt={item.name}
                      className="w-10 h-10 mr-2"
                    />
                    <span className="text-lg md:text-2xl font-bold flex-1">
                      {item.name}
                      {item.id === localConnectorId && ' (Current)'}
                    </span>
                    {!item.installed && (
                      <span className="justify-self-end text-orange-400">
                        Not Installed
                      </span>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
