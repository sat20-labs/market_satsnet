import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 通用筛选下拉框组件
 * @param {Object} props
 * @param {string|number} props.value 当前选中值
 * @param {{label: string, value: string|number}[]} props.options 筛选项
 * @param {(value: string|number) => void} props.onChange 选中变化回调
 * @param {string} [props.placeholder] 占位符
 * @param {string} [props.className] 额外样式
 */
export const FilterSelect = ({
  value,
  options,
  onChange,
  placeholder = '',
  className = '',
}: {
  value: string | number,
  options: { label: string, value: string | number }[],
  onChange: (value: string | number) => void,
  placeholder?: string,
  className?: string,
}) => {
  return (
    <Select
      value={String(value)}
      onValueChange={(val) => onChange(typeof value === 'number' ? Number(val) : val)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}; 