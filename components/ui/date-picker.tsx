"use client"

import * as React from "react"
import dayjs from "dayjs"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

interface MonthPickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  max?: string
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Pick a month",
  className,
  disabled,
  max,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [year, setYear] = React.useState(() => {
    if (value) {
      const [y] = value.split("-").map(Number)
      return y || currentYear
    }
    return currentYear
  })

  const selectedYear = value ? Number(value.split("-")[0]) : null
  const selectedMonth = value ? Number(value.split("-")[1]) : null

  const maxParsed = React.useMemo(() => {
    if (!max) return null
    const [y, m] = max.split("-").map(Number)
    return { year: y, month: m }
  }, [max])

  const isDisabled = (month: number) => {
    if (maxParsed) {
      if (year > maxParsed.year) return true
      if (year === maxParsed.year && month > maxParsed.month) return true
    }
    return false
  }

  const isCurrent = (month: number) => year === currentYear && month === currentMonth + 1

  const handleSelect = (month: number) => {
    onChange(`${year}-${String(month).padStart(2, "0")}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
        {value ? (
          <span>{MONTHS[(selectedMonth ?? 1) - 1]} {selectedYear}</span>
        ) : (
          <span>{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setYear((y) => y - 1)}
            nativeButton={false}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">{year}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setYear((y) => y + 1)}
            disabled={maxParsed ? year >= maxParsed.year : year >= currentYear + 1}
            nativeButton={false}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((label, i) => {
            const month = i + 1
            const selected = selectedYear === year && selectedMonth === month
            const current = isCurrent(month)
            const disabled = isDisabled(month)
            return (
              <Button
                key={month}
                variant={selected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 text-xs font-medium",
                  !selected && current && "ring-1 ring-primary/50",
                  disabled && "opacity-30 pointer-events-none"
                )}
                onClick={() => handleSelect(month)}
                disabled={disabled}
                nativeButton={false}
              >
                {label}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  max?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  id,
  max,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const date = React.useMemo(() => {
    if (!value) return undefined
    const parsed = dayjs(value, "YYYY-MM-DD", true)
    return parsed.isValid() ? parsed.toDate() : undefined
  }, [value])

  const maxDate = React.useMemo(() => {
    if (!max) return undefined
    const parsed = dayjs(max, "YYYY-MM-DD", true)
    return parsed.isValid() ? parsed.toDate() : undefined
  }, [max])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
        {date ? dayjs(date).format("MMM D, YYYY") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(day) => {
            onChange(day ? dayjs(day).format("YYYY-MM-DD") : "")
            setOpen(false)
          }}
          disabled={(date) =>
            maxDate ? date > maxDate : false
          }
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
