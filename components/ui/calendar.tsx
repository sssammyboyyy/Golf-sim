"use client"

import type * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full", className)}
      classNames={{
        months: "flex flex-col w-full",
        month: "w-full space-y-4",
        caption: "flex justify-between items-center px-2 pt-2 pb-4",
        caption_label: "text-lg font-semibold text-foreground",
        nav: "flex items-center gap-2",
        nav_button: cn(
          "h-10 w-10 inline-flex items-center justify-center rounded-full",
          "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
          "transition-all duration-200 active:scale-95",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 mb-2",
        head_cell: cn(
          "text-muted-foreground text-xs font-semibold uppercase tracking-wider",
          "h-10 flex items-center justify-center",
        ),
        row: "grid grid-cols-7 gap-1",
        cell: cn("relative p-0.5", "[&:has([aria-selected])]:bg-transparent"),
        day: cn(
          "h-11 w-full rounded-xl inline-flex items-center justify-center",
          "text-sm font-medium transition-all duration-200",
          "hover:bg-primary/10 hover:text-primary",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
          "active:scale-95",
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground",
          "hover:bg-primary hover:text-primary-foreground",
          "shadow-lg shadow-primary/25",
        ),
        day_today: cn("bg-secondary/20 text-secondary font-bold", "ring-2 ring-secondary/50"),
        day_outside: "text-muted-foreground/40",
        day_disabled: "text-muted-foreground/25 cursor-not-allowed hover:bg-transparent",
        day_range_middle: "aria-selected:bg-accent/20 aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeftIcon className="h-5 w-5" />,
        IconRight: () => <ChevronRightIcon className="h-5 w-5" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
