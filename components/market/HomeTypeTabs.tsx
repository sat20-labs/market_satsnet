import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

interface HomeTypeTabsProps {
  value: string;
  onChange?: (key: string) => void;
  tabs?: { label: string; key: string }[];
}
export const HomeTypeTabs = ({ value, onChange, tabs }: HomeTypeTabsProps) => {
  const { t } = useTranslation(); // Specify the namespace

  const defaultList = [
    {
      label: t('pages.home.ordx'), // Use translation key for OrdX
      key: 'ordx',
    },
    {
      label: t('pages.home.runes'), // Use translation key for Runes
      key: 'runes',
    },
  ];
  const list = tabs && tabs.length > 0 ? tabs : defaultList;
  const changeHandler = (key: string) => {
    console.log(key);
    onChange?.(key);
  };

  return (
    <Tabs
      value={value}
      onValueChange={changeHandler}
      className="h-full"
    >
      <TabsList className="h-full">
        {list.map((item) => (
          <TabsTrigger
            key={item.key}
            value={item.key}
            className="px-4 h-9"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};