import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Strategic Account Groups</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Group related client names under one executive account. Client records themselves are never
            changed — names are matched, case-insensitively, on any part of the recorded client name.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-4 py-1">
            {groups.map((group, index) => (
              <div key={group.id} className="rounded-lg border border-border p-3 space-y-3">
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
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
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
          <Button
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
          <Button onClick={handleSave}>Save groups</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
