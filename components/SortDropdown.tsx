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
  sortList: { label: string; value: number }[];
  value?: number;
  disabled?: boolean;
  onChange?: (value?: number) => void;
}

export const SortDropdown = ({
  value,
  onChange,
  sortList,
  disabled = false,
}: SortDropdownProps) => {
  // 使用 string 类型存储选中的值，因为 shadcn Select 的 value 是 string
  const [selectedValue, setSelectedValue] = useState<string>(
    value?.toString() ?? '0'
  );

  // 当外部 value prop 变化时，同步更新内部 state
  useEffect(() => {
    setSelectedValue(value?.toString() ?? '0');
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    const numValue = Number(newValue);
    // 确保转换后的值是有效的数字，如果不是，则传递 undefined 或 0，取决于你的业务逻辑
    onChange?.(isNaN(numValue) ? undefined : numValue);
  };

  // 获取当前选中项的 label 用于显示
  const selectedLabel =
    sortList.find((item) => item.value.toString() === selectedValue)?.label ??
    sortList.find((item) => item.value === 0)?.label; // Fallback to default if needed

  const { t } = useTranslation();
  // const sortList = [
  //   { label: t('common.not_sort'), value: 0 },
  //   { label: t('common.sort_price_ascending'), value: 1 },
  //   { label: t('common.sort_price_descending'), value: 2 },
  //   { label: t('common.sort_time_ascending'), value: 3 },
  //   { label: t('common.sort_time_descending'), value: 4 },
  // ];

  return (
    <Select
      disabled={disabled}
      value={selectedValue}
      defaultValue={'0'} // 默认值也应该是 string
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        className="w-[115px] sm:w-48 sm:m-2 h-10 bg-transparent focus:ring-0 focus:ring-offset-0" // 移除了 style，将样式合并到 className
        style={{ height: '40px' }} // 保留强制高度 style
      >
        {/* 使用 SelectValue 显示占位符或选中值 */}
        <SelectValue placeholder={selectedLabel || 'Select an option'}>
          {selectedLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortList.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value.toString()} // value 必须是 string
            className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-200" // 调整 focus 样式以匹配 shadcn 风格
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
