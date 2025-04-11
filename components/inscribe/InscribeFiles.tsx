import type { UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Dragger } = Upload;

interface InscribeFilesProps {
  onNext?: () => void;
  onChange?: (files: any[]) => void;
}
export const InscribeFiles = ({ onChange }: InscribeFilesProps) => {
  const [files, setFiles] = useState<any[]>([]);
  const { t } = useTranslation();
  const [originFiles, setOriginFiles] = useState<any[]>([]);
  const filesChange: UploadProps['onChange'] = ({ file, fileList }) => {
    const originFiles = fileList.map((f) => f.originFileObj);
    onChange?.(originFiles);
    setOriginFiles(originFiles);
    setFiles([]);
  };
  return (
    <div>
      <div className="mb-4 text-center py-4">
        <p>{t('pages.inscribe.files.upload_title')}</p>
      </div>
      <div className="mb-4">
        <Dragger
          multiple
          fileList={files}
          onChange={filesChange}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className=" dark:text-white">
            {t('pages.inscribe.files.upload_des_1')}
          </p>
          <p className="dark:text-white">
            {t('pages.inscribe.files.upload_des_2')}
          </p>
        </Dragger>
      </div>
    </div>
  );
};
