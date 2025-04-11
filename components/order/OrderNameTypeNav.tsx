import { Button, Tooltip } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { FC } from 'react';

interface OrderNameTypeNavProps {
  value?: string;
  list: any[];
  onChange?: (value: string) => void;
}

export const OrderNameTypeNav: FC<OrderNameTypeNavProps> = ({
  value,
  list,
  onChange,
}) => {
  const { t } = useTranslation();

  const handlerClick = (item) => {
    onChange?.(item.value);
  };

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {list.map((item) =>
        item.tooltip ? (
          <Tooltip key={item.value} content={item.tooltip}>
            <Button
              variant="ghost"
              color={value === item.value ? 'primary' : 'default'}
              radius="full"
              onClick={() => handlerClick(item)}
            >
              {item.label}
            </Button>
          </Tooltip>
        ) : (
          <Button
            key={item.value}
            variant="ghost"
            color={value === item.value ? 'primary' : 'default'}
            radius="full"
            onClick={() => handlerClick(item)}
          >
            {item.label}
          </Button>
        ),
      )}
    </div>
  );
};
