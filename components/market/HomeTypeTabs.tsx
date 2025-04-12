import { Tabs, Tab } from '@nextui-org/react';

interface HomeTypeTabsProps {
  value: string;
  onChange?: (key: any) => void;
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
    {
      label: 'Names',
      key: 'ns',
    },
    {
      label: 'Rare',
      key: 'exotic',
    },
    
  ];
  const changeHandler = (key: any) => {
    console.log(key);
    onChange?.(key);
  };

  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={changeHandler}
      className="border border-zinc-800/90 rounded-xl my-0 sm:my-0"
      classNames={{
        tabList: "bg-transparent h-full", // 设置 TabList 的背景色为透明
      }}
    >
      {list.map((item) => (
        <Tab
          key={item.key}
          title={item.label}
          className="px-2 sm:px-4 py-2 text-sm sm:text-base bg-zinc-900/90 text-zinc-50 hover:text-white rounded-lg"
        ></Tab>
      ))}
    </Tabs>
  );
};