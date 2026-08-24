import { useMemo, useState } from "react";
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

/** Max chips rendered in the trigger before collapsing into a "+N more" pill */
const MAX_VISIBLE_BADGES = 6;
/** Max option rows mounted at once (keeps the DOM small on huge lists) */
const MAX_RENDERED_OPTIONS = 100;

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

  const valueSet = useMemo(() => new Set(values), [values]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const renderedOptions = useMemo(
    () => filteredOptions.slice(0, MAX_RENDERED_OPTIONS),
    [filteredOptions]
  );
  const hiddenOptionCount = filteredOptions.length - renderedOptions.length;

  const allFilteredSelected = useMemo(
    () => filteredOptions.length > 0 && filteredOptions.every((o) => valueSet.has(o.value)),
    [filteredOptions, valueSet]
  );

  const toggleValue = (val: string) => {
    if (valueSet.has(val)) {
      onValuesChange(values.filter((v) => v !== val));
    } else {
      onValuesChange([...values, val]);
    }
  };

  const handleSelectAllToggle = () => {
    if (allFilteredSelected) {
      const toRemove = new Set(filteredOptions.map((o) => o.value));
      onValuesChange(values.filter((v) => !toRemove.has(v)));
    } else {
      const next = new Set(values);
      for (const o of filteredOptions) next.add(o.value);
      onValuesChange(Array.from(next));
    }
  };

  const removeValue = (val: string, e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== val));
  };

  const optionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of options) map.set(o.value, o.label);
    return map;
  }, [options]);

  const visibleBadges = useMemo(
    () =>
      values.slice(0, MAX_VISIBLE_BADGES).map((v) => ({
        value: v,
        label: optionLabelMap.get(v) ?? `${v} — Unknown, please update`,
      })),
    [values, optionLabelMap]
  );
  const overflowCount = values.length - visibleBadges.length;

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
          <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
            {values.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {visibleBadges.map((opt) => (
                  <Badge key={opt.value} variant="secondary" className="gap-1 text-xs max-w-[180px]">
                    <span className="truncate">{opt.label}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      className="w-3 h-3 cursor-pointer inline-flex items-center justify-center shrink-0"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeValue(opt.value, e);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </Badge>
                ))}
                {overflowCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    +{overflowCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          {filteredOptions.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSelectAllToggle}
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
                {query.trim() ? " (filtered)" : ""}
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
              {renderedOptions.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={() => toggleValue(option.value)}>
                  <Check className={cn("mr-2 h-4 w-4", valueSet.has(option.value) ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {hiddenOptionCount > 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                {hiddenOptionCount} more option{hiddenOptionCount === 1 ? "" : "s"} — refine your search to narrow the list.
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
