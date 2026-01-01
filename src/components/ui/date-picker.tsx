import * as React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface DatePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
}

const DatePickerComponent = React.forwardRef<DatePicker, DatePickerProps>(
  ({ selected, onChange, placeholderText, className }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <DatePicker
          ref={ref}
          selected={selected}
          onChange={onChange}
          placeholderText={placeholderText}
          className="flex w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-full"
          wrapperClassName="w-full h-full"
        />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    );
  }
);

DatePickerComponent.displayName = "DatePicker";

export { DatePickerComponent };