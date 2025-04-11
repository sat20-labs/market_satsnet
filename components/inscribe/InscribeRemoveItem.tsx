import { Button } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { clacHexSize } from '@/lib/inscribe';
interface InscribeCheckItemProps {
  label: string | number;
  value: string;
  hex: string;
  onRemove?: () => void;
}
export const InscribeRemoveItem = ({
  label,
  value,
  hex,
  onRemove,
}: InscribeCheckItemProps) => {
  return (
    <div className="min-h-[3rem] flex rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 w-full">
      <div className="flex justify-center items-center  w-14">
        <div className="w-6 h-6 bg-gray-400 dark:bg-gray-500 rounded-full flex justify-center items-center">
          {label}
        </div>
      </div>
      <div className="flex flex-1 text-sm items-center py-2 break-all">
        {value}
      </div>
      <div className="flex items-center pr-2">
        {!!hex && <span className="mr-2">{clacHexSize(hex)} B</span>}

        <Button onClick={onRemove} isIconOnly>
          <Icon icon="mdi:close-circle" className="text-lg" />
        </Button>
      </div>
    </div>
  );
};
