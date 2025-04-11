import { hideStr } from '@/lib/utils';
import { useMemo } from 'react';
import { Snippet } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
interface InscribeCheckItemProps {
  label: string | number;
  value: string;
  address: string;
  offset?: number;
  txid?: string;
  status: any;
}
export const InscribeOrderItem = ({
  label,
  value,
  status,
  address,
  txid,
  offset = 0,
}: InscribeCheckItemProps) => {
  const { t } = useTranslation();
  const inscriptionId = useMemo(() => `${txid}i${offset}`, [txid, offset]);
  return (
    <div className="min-h-[4rem] flex  rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 w-full">
      <div className="flex justify-center items-center bg-gray-300 dark:bg-gray-600 w-20">
        <div className="w-6 h-6 bg-gray-400 rounded-full flex justify-center items-center">
          {label}
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center px-4 py-2  justify-between">
        <div>
          <div className="break-all mb-1">{value}</div>
          <div className="text-gray-500">{hideStr(address, 10)}</div>
        </div>
        {!!txid ? (
          <div>
            <Snippet
              codeString={inscriptionId}
              className="bg-transparent text-lg md:text-2xl font-thin items-center"
              symbol=""
              variant="flat"
            >
              <div className="flex flex-col justify-center items-center">
                <span className="text-base font-thin text-slate-400">
                  {t('common.inscription_id')}
                </span>
                <span className="text-gray-500 text-sm">
                  {hideStr(inscriptionId, 4)}
                </span>
              </div>
            </Snippet>
          </div>
        ) : (
          <span className="ml-3">{status}</span>
        )}
      </div>
    </div>
  );
};
