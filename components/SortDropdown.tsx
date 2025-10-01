import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // 假设你的 shadcn 组件路径是 @/components/ui/select
import { useTranslation } from 'react-i18next';

interface SortDropdownProps {
  sortList: { label: string; value: string }[];
  value?: string;
  disabled?: boolean;
  onChange?: (value?: string) => void;
}

export const SortDropdown = ({
  value,
  onChange,
  sortList,
  disabled = false,
}: SortDropdownProps) => {
  const [selectedValue, setSelectedValue] = useState<string>(value ?? '');

  useEffect(() => {
    setSelectedValue(value ?? '');
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onChange?.(newValue);
  };

  const selectedLabelObj = sortList.find((item) => item.value === selectedValue) ?? sortList[0];
  const selectedLabel = selectedLabelObj?.label ?? '';
  const selectedArrow = selectedValue.endsWith('_desc') ? (
    <span className="text-fuchsia-500 font-black mb-1 ml-1">↓</span>
  ) : selectedValue.endsWith('_asc') ? (
    <span className="text-fuchsia-500 font-black mb-1 ml-1">↑</span>
  ) : null;

  const { t } = useTranslation();

  return (
    <Select
      disabled={disabled}
      value={selectedValue}
      defaultValue={''}
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        className="w-[160px] sm:w-48 sm:m-2 h-10 bg-transparent focus:ring-0 focus:ring-offset-0"
        style={{ height: '40px' }}
      >
        <SelectValue placeholder={selectedLabel || 'Select an option'}>
          <span className="inline-flex items-center">{selectedLabel}{selectedArrow}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortList.map((item) => {
          const arrow = item.value.endsWith('_desc') ? (
            <span className="text-fuchsia-500 font-black mb-1 ml-1">↓</span>
          ) : item.value.endsWith('_asc') ? (
            <span className="text-fuchsia-500 font-black mb-1 ml-1">↑</span>
          ) : null;
          return (
            <SelectItem
              key={item.value}
              value={item.value}
              className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-200"
            >
              <span className="inline-flex items-center">{item.label}{arrow}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
