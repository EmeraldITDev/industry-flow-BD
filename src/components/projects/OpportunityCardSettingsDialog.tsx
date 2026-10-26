import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DEFAULT_OPPORTUNITY_CARD_FIELDS,
  OPPORTUNITY_CARD_FIELD_OPTIONS,
} from '@/services/opportunityCardPreferences';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: string[];
  canViewFinancialFields: boolean;
  title: string;
  description: string;
  saving?: boolean;
  onSave: (fields: string[]) => void | Promise<void>;
  onRestoreDefaults?: () => void;
  onResetToGlobal?: () => void | Promise<void>;
};

export function OpportunityCardSettingsDialog({
  open,
  onOpenChange,
  fields,
  canViewFinancialFields,
  title,
  description,
  saving = false,
  onSave,
  onRestoreDefaults,
  onResetToGlobal,
}: Props) {
  const [selected, setSelected] = useState<string[]>(fields);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      OPPORTUNITY_CARD_FIELD_OPTIONS.filter(
        (field) => canViewFinancialFields || !('financial' in field),
      ),
    [canViewFinancialFields],
  );
  const labels = useMemo(
    () => new Map(options.map((field) => [field.key, field.label])),
    [options],
  );

  useEffect(() => {
    if (open) {
      setSelected(fields.filter((field) => labels.has(field)));
      setError(null);
    }
  }, [fields, labels, open]);

  const toggle = (key: string, checked: boolean) => {
    setSelected((current) =>
      checked
        ? [...current, key]
        : current.filter((field) => field !== key),
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    setSelected((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const save = async () => {
    setError(null);
    try {
      await onSave(selected);
      onOpenChange(false);
    } catch {
      setError('Unable to save these card settings. Please try again.');
    }
  };

  const resetToGlobal = async () => {
    if (!onResetToGlobal) return;
    setError(null);
    try {
      await onResetToGlobal();
      onOpenChange(false);
    } catch {
      setError('Unable to reset this card. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-2">
          <section className="space-y-2" aria-label="Available card fields">
            <h3 className="text-sm font-medium">Available fields</h3>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
              {options.map((field) => {
                const checked = selected.includes(field.key);
                return (
                  <label
                    key={field.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={'required' in field}
                      onCheckedChange={(value) =>
                        toggle(field.key, value === true)
                      }
                    />
                    <span>{field.label}</span>
                  </label>
                );
              })}
            </div>
            {onRestoreDefaults && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(
                    DEFAULT_OPPORTUNITY_CARD_FIELDS.filter((field) => labels.has(field)),
                  );
                  setError(null);
                  onRestoreDefaults?.();
                }}
              >
                Restore defaults
              </Button>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Display order</h3>
            <ol className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
              {selected.length === 0 ? (
                <li className="px-2 py-3 text-sm text-muted-foreground">
                  No optional fields selected.
                </li>
              ) : (
                selected.map((field, index) => (
                  <li
                    key={field}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-accent/50"
                  >
                    <span className="min-w-0 truncate">
                      {labels.get(field) ?? field}
                    </span>
                    <span className="flex shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${labels.get(field) ?? field} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="h-7 w-7"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${labels.get(field) ?? field} down`}
                        disabled={index === selected.length - 1}
                        onClick={() => move(index, 1)}
                        className="h-7 w-7"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </span>
                  </li>
                ))
              )}
            </ol>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Preview
              </p>
              <p className="truncate text-sm font-semibold">Opportunity name</p>
              <div className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
                {selected.map((field) => (
                  <span key={field} className="truncate text-xs text-muted-foreground">
                    {labels.get(field) ?? field}: —
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {onResetToGlobal && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void resetToGlobal()}
                disabled={saving}
              >
                Reset to Global Settings
              </Button>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
