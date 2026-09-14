import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  AccountGroup,
  DEFAULT_ACCOUNT_GROUPS,
  loadAccountGroups,
  resetAccountGroups,
  saveAccountGroups,
} from '@/lib/executive/accountGroups';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (groups: AccountGroup[]) => void;
}

export function AccountGroupManager({ open, onOpenChange, onSaved }: Props) {
  const [groups, setGroups] = useState<AccountGroup[]>([]);

  useEffect(() => {
    if (open) setGroups(loadAccountGroups());
  }, [open]);

  const update = (index: number, patch: Partial<AccountGroup>) =>
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const handleSave = () => {
    const cleaned = groups
      .filter((g) => g.name.trim())
      .map((g) => ({
        ...g,
        name: g.name.trim(),
        aliases: g.aliases.map((a) => a.trim()).filter(Boolean),
        entities: (g.entities ?? []).map((e) => e.trim()).filter(Boolean),
      }));
    saveAccountGroups(cleaned);
    onSaved(cleaned);
    toast.success('Strategic account groups updated');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] !flex !flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle>Strategic Account Groups</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Group related client names under one executive account. Client records themselves are never
            changed — names are matched, case-insensitively, on any part of the recorded client name.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {groups.map((group, index) => (
              <div key={group.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Group name</Label>
                    <Input
                      value={group.name}
                      onChange={(e) => update(index, { name: e.target.value })}
                      placeholder="Dangote Group"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setGroups((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Remove group"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Client name matches (comma separated)</Label>
                  <Input
                    value={group.aliases.join(', ')}
                    onChange={(e) => update(index, { aliases: e.target.value.split(',') })}
                    placeholder="dangote, dprp, dfl, dcp"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Entity labels for the in-group breakdown (optional)</Label>
                  <Input
                    value={(group.entities ?? []).join(', ')}
                    onChange={(e) => update(index, { entities: e.target.value.split(',') })}
                    placeholder="DPRP, DFL, DCP"
                  />
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No account groups yet. Add a group to get started.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border bg-background px-6 py-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setGroups((prev) => [
                ...prev,
                { id: `group-${Date.now()}`, name: '', aliases: [], entities: [] },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add group
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetAccountGroups();
                setGroups(DEFAULT_ACCOUNT_GROUPS);
                onSaved(DEFAULT_ACCOUNT_GROUPS);
                toast.info('Reset to the default account groups');
              }}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reset to defaults
            </Button>
            <Button type="button" onClick={handleSave}>
              Save groups
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
