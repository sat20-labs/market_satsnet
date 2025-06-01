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
 * @param {string} [props.width] 宽度，如 "150px" 或 "100%"
 */
export const FilterSelect = ({
  value,
  options,
  onChange,
  placeholder = '',
  className = '',
  width = '150px', // 添加默认宽度参数
}: {
  value: string | number,
  options: { label: string, value: string | number }[],
  onChange: (value: string | number) => void,
  placeholder?: string,
  className?: string,
  width?: string, // 添加宽度参数类型
}) => {
  // 合并默认样式和传入的className
  const combinedClassName = `w-full max-w-[${width}] bg-zinc-800 border-zinc-700 text-gray-300 h-8 text-xs sm:text-sm ${className}`;
  
  return (
    <Select
      value={String(value)}         
      onValueChange={(val) => onChange(typeof value === 'number' ? Number(val) : val)}
    >
      <SelectTrigger className={combinedClassName}>
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