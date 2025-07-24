import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange as ReactDayPickerDateRange } from "react-day-picker";

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  className
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (range: ReactDayPickerDateRange | undefined) => {
    const convertedRange: DateRange | undefined = range ? {
      from: range.from,
      to: range.to
    } : undefined;
    onChange?.(convertedRange);
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder;
    if (!range.to) return format(range.from, "MMM dd, yyyy");
    return `${format(range.from, "MMM dd, yyyy")} - ${format(range.to, "MMM dd, yyyy")}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value as any}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DateRangePicker };
export type { DateRange };