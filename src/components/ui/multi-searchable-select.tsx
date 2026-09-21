import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
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
  /** Allow adding values that are not in the options list. */
  allowCreate?: boolean;
  createLabel?: (query: string) => string;
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
  allowCreate = false,
  createLabel = (q) => `Add "${q}"`,
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

  const trimmedQuery = query.trim();
  const canCreate =
    allowCreate &&
    trimmedQuery.length > 0 &&
    !valueSet.has(trimmedQuery) &&
    !options.some((o) => o.value.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !options.some((o) => o.label.toLowerCase() === trimmedQuery.toLowerCase());

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

  const addCreatedValue = (val: string) => {
    const next = val.trim();
    if (!next) return;
    if (!valueSet.has(next)) {
      onValuesChange([...values, next]);
    }
    setQuery("");
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
        label: optionLabelMap.get(v) ?? v,
      })),
    [values, optionLabelMap]
  );
  const overflowCount = values.length - visibleBadges.length;

  return (
    <Popover
      // false: nested inside Sheet/Dialog; modal=true fights the sheet dismiss layer and drops clicks.
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
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
                      aria-label={`Remove ${opt.label}`}
                      className="w-3 h-3 cursor-pointer inline-flex items-center justify-center shrink-0 rounded-sm hover:bg-muted"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeValue(opt.value, e);
                      }}
                      onClick={(e) => {
                        // PopoverTrigger is a <button>; stop the click from toggling open.
                        e.preventDefault();
                        e.stopPropagation();
                        removeValue(opt.value, e);
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
      <PopoverContent
        className="z-[100] w-[--radix-popover-trigger-width] p-0 flex flex-col overflow-hidden max-h-[min(24rem,var(--radix-popover-content-available-height))]"
        align="start"
        side="bottom"
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="min-h-0">
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          {(filteredOptions.length > 0 || canCreate) && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1.5">
              {filteredOptions.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectAllToggle();
                  }}
                >
                  {allFilteredSelected ? "Deselect all" : "Select all"}
                  {query.trim() ? " (filtered)" : ""}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground px-1">
                  {allowCreate ? "Type to add a new value" : ""}
                </span>
              )}
              {values.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onValuesChange([]);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          <CommandList className="max-h-none min-h-0 flex-1">
            <CommandEmpty>
              {canCreate ? "Choose Add below to create this value." : emptyText}
            </CommandEmpty>
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmedQuery}`}
                  onMouseDown={(e) => {
                    // Keep focus; Sheet outside handlers must not win over the click.
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => addCreatedValue(trimmedQuery)}
                >
                  <Plus className="mr-2 h-4 w-4 text-primary" />
                  <span className="truncate">{createLabel(trimmedQuery)}</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {renderedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => toggleValue(option.value)}
                >
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
