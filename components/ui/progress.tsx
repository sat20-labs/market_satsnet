import React from "react";

interface ProgressProps {
  value: number; // 当前进度值 (0-100)
  className?: string; // 自定义样式
}

export const Progress: React.FC<ProgressProps> = ({ value, className }) => {
  return (
    <div className={`relative w-full h-2 bg-gray-700 rounded-lg overflow-hidden ${className}`}>
      <div
        className="absolute top-0 left-0 h-full bg-green-500 transition-all"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};