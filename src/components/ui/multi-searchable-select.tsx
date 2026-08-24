import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MultiSearchableSelectProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export function MultiSearchableSelect({
  values,
  onValuesChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
}: MultiSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleOptions = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const allVisibleSelected =
    visibleOptions.length > 0 && visibleOptions.every((o) => values.includes(o.value));

  const toggleValue = (val: string) => {
    if (values.includes(val)) {
      onValuesChange(values.filter((v) => v !== val));
    } else {
      onValuesChange([...values, val]);
    }
  };

  const removeValue = (val: string, e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== val));
  };
  const selectedLabels = values.map(
    (v) => options.find((o) => o.value === v) ?? { value: v, label: `${v} — Unknown, please update` }
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-auto min-h-10 py-1.5"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedLabels.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedLabels.map((opt) => (
                <Badge key={opt!.value} variant="secondary" className="gap-1 text-xs">
                  {opt!.label}
                  <span
                    role="button"
                    tabIndex={-1}
                    className="w-3 h-3 cursor-pointer inline-flex items-center justify-center"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeValue(opt!.value, e);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          {visibleOptions.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (allVisibleSelected) {
                    onValuesChange(values.filter((v) => !visibleOptions.some((o) => o.value === v)));
                  } else {
                    const next = new Set(values);
                    visibleOptions.forEach((o) => next.add(o.value));
                    onValuesChange(Array.from(next));
                  }
                }}
              >
                {allVisibleSelected ? "Deselect all" : "Select all"}
                {query ? " (filtered)" : ""}
              </Button>
              {values.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => onValuesChange([])}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.label} onSelect={() => toggleValue(option.value)}>
                  <Check className={cn("mr-2 h-4 w-4", values.includes(option.value) ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
