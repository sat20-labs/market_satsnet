import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Button,
} from '@nextui-org/react';
import { version } from '@/assets/version';
import { getAppVersion } from '@/api';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store';

export const UpdateVersionModal = () => {
  const { setAppVersion } = useCommonStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const showModal = () => {
    setOpen(true);
  };
  useSWR(`getAppVersion-${version}`, () => getAppVersion(), {
    refreshInterval: 1000 * 60 * 2,
    onSuccess: (appVersion) => {
      console.log(appVersion);
      if (appVersion && Number(appVersion) > version) {
        showModal();
      }
    },
  });
  const timer = useRef<any>();

  const refresh = () => {
    setOpen(false);
    window.location.reload();
  };
  const hideModal = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        // checkVersion();
      },
      1000 * 60 * 5,
    );
    setOpen(false);
  };
  useEffect(() => {
    setAppVersion(version);
  }, []);
  return (
    <Modal
      backdrop="blur"
      isDismissable={false}
      isOpen={open}
      onClose={hideModal}
    >
      <ModalContent>
        <ModalHeader className="">
          {t('pages.app.version_update_title')}
        </ModalHeader>
        <ModalFooter>
          <Button color="primary" variant="light" onPress={hideModal}>
            {t('buttons.talk_later')}
          </Button>
          <Button color="danger" onPress={refresh}>
            {t('buttons.update_now')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
