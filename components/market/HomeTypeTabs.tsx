import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HomeTypeTabsProps {
  value: string;
  onChange?: (key: string) => void;
}
export const HomeTypeTabs = ({ value, onChange }: HomeTypeTabsProps) => {
  const list = [
    {
      label: 'OrdX',
      key: 'ordx',
    },
    {
      label: 'Runes',
      key: 'runes',
    },
    
  ];
  const changeHandler = (key: string) => {
    console.log(key);
    onChange?.(key);
  };

  return (
    <Tabs
      value={value}
      onValueChange={changeHandler}
      className=" h-full"
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