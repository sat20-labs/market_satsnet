"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showTimeSelect?: boolean; // 兼容外部传入但不实际实现
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className = "",
  disabled = false,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-[200px] justify-start text-left font-normal ${className}`}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd HH:mm") : <span className="text-gray-400">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
      </PopoverContent>
    </Popover>
  );
}