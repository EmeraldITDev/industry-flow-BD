import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { contactsService, type ContactSummary, type ContactType } from '@/services/contacts';

interface Props {
  organizationType: ContactType;
  organizationName: string;
  selectedIds: string[];
  onSelect: (contact: ContactSummary) => void;
  disabled?: boolean;
}

const emptyForm = { fullName: '', jobTitle: '', department: '', email: '', phone: '' };

export function ContactDirectoryPicker({ organizationType, organizationName, selectedIds, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchAll, setSearchAll] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [duplicates, setDuplicates] = useState<ContactSummary[]>([]);
  const selected = useMemo(() => new Set(selectedIds.filter(Boolean)), [selectedIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const contactsQuery = useQuery({
    queryKey: ['contact-picker', organizationType, organizationName, searchAll, debouncedQuery],
    queryFn: () => contactsService.list({
      search: debouncedQuery || undefined,
      type: organizationType,
      organization: searchAll ? undefined : organizationName.trim() || undefined,
      isActive: true,
      perPage: 30,
    }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => contactsService.create({
      fullName: form.fullName.trim(),
      jobTitle: form.jobTitle.trim() || null,
      department: form.department.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      organizationType,
      organizationName: organizationName.trim() || null,
      isActive: true,
    }),
    onSuccess: (contact) => {
      onSelect(contact);
      setForm(emptyForm);
      setDuplicates([]);
      setCreateOpen(false);
      setOpen(false);
      toast.success('Contact created and selected');
    },
    onError: () => toast.error('Unable to create contact'),
  });

  const submitNew = async (allowDuplicate = false) => {
    if (!form.fullName.trim()) return;
    if (!allowDuplicate && (form.email.trim() || form.phone.trim())) {
      const matches = await contactsService.findDuplicates(form.email.trim(), form.phone.trim());
      if (matches.length > 0) {
        setDuplicates(matches);
        return;
      }
    }
    createMutation.mutate();
  };

  const choose = (contact: ContactSummary) => {
    if (selected.has(contact.id)) {
      toast.info('This contact is already selected');
      return;
    }
    onSelect(contact);
    setOpen(false);
    setCreateOpen(false);
    setDuplicates([]);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled} role="combobox">
              <Search className="mr-2 h-4 w-4" /> Select Existing Contact
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(28rem,var(--radix-popover-content-available-width))] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search name, email, or phone…" value={query} onValueChange={setQuery} />
              <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
                <span>{searchAll ? `All ${organizationType} contacts` : organizationName || `All ${organizationType} contacts`}</span>
                {organizationName.trim() && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSearchAll((value) => !value)}>
                    {searchAll ? 'Limit to organization' : 'Search wider directory'}
                  </Button>
                )}
              </div>
              <CommandList>
                <CommandEmpty>{contactsQuery.isFetching ? 'Searching…' : 'No contacts found.'}</CommandEmpty>
                <CommandGroup>
                  {(contactsQuery.data?.data ?? []).map((contact) => (
                    <CommandItem key={contact.id} value={contact.id} onSelect={() => choose(contact)} disabled={selected.has(contact.id)}>
                      <Check className={cn('mr-2 h-4 w-4', selected.has(contact.id) ? 'opacity-100' : 'opacity-0')} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{contact.fullName || contact.email || contact.phone || 'Unnamed contact'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[contact.jobTitle, contact.organizationName, contact.email].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Contact
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={(next) => { setCreateOpen(next); if (!next) setDuplicates([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>The contact will be saved to the central directory and selected here.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Full Name *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="space-y-2"><Label>Job Title</Label><Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></div>
            <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          {duplicates.length > 0 && (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">Possible duplicate found</p>
              {duplicates.map((contact) => (
                <Button key={contact.id} type="button" variant="ghost" className="h-auto w-full justify-start px-2 py-1" onClick={() => choose(contact)}>
                  Use {contact.fullName || contact.email || contact.phone}
                </Button>
              ))}
              <Button type="button" variant="link" className="h-auto px-2" onClick={() => submitNew(true)}>Create a separate contact anyway</Button>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!form.fullName.trim() || createMutation.isPending} onClick={() => submitNew()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create and Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
