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
import { evaluateContactCompatibility } from '@/lib/contactPickerCompatibility';
import { contactsService, type ContactSummary, type ContactType } from '@/services/contacts';

interface Props {
  organizationType: ContactType;
  organizationName: string;
  selectedIds: string[];
  onSelect: (contact: ContactSummary) => void;
  disabled?: boolean;
}

const emptyForm = { fullName: '', jobTitle: '', department: '', email: '', phone: '' };

type PickerScope = 'eligible' | 'organization' | 'directory';

function emptyMessage(
  scope: PickerScope,
  organizationType: ContactType,
  organizationName: string,
  isError: boolean,
  isFetching: boolean,
): string {
  if (isFetching) return 'Searching…';
  if (isError) return 'Unable to load contacts. Check your connection and try again.';
  if (scope === 'organization' && organizationName.trim()) {
    return `No ${organizationType} contacts found for “${organizationName.trim()}”. Try the shared directory.`;
  }
  if (scope === 'directory') return 'No contacts match this search in the shared directory.';
  return `No eligible ${organizationType} contacts found. Try the shared directory or add a new contact.`;
}

export function ContactDirectoryPicker({ organizationType, organizationName, selectedIds, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [scope, setScope] = useState<PickerScope>('eligible');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [duplicates, setDuplicates] = useState<ContactSummary[]>([]);
  const selected = useMemo(() => new Set(selectedIds.filter(Boolean)), [selectedIds]);
  const trimmedOrg = organizationName.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  // When the organization field clears, organization-limited scope is meaningless.
  useEffect(() => {
    if (!trimmedOrg && scope === 'organization') {
      setScope('eligible');
    }
  }, [trimmedOrg, scope]);

  const contactsQuery = useQuery({
    queryKey: ['contact-picker', organizationType, trimmedOrg, scope, debouncedQuery],
    queryFn: () => contactsService.list({
      search: debouncedQuery || undefined,
      // Shared-directory mode intentionally omits eligibility so incompatibles
      // can be shown with an explanation instead of being hidden.
      eligibleFor: scope === 'directory' ? undefined : organizationType,
      organization: scope === 'organization' && trimmedOrg ? trimmedOrg : undefined,
      prioritizeOrganization: trimmedOrg || undefined,
      isActive: true,
      perPage: 30,
    }),
    enabled: open,
    retry: 1,
  });

  const rows = useMemo(() => {
    const contacts = contactsQuery.data?.data ?? [];
    return contacts.map((contact) => ({
      contact,
      compatibility: evaluateContactCompatibility(contact, organizationType, trimmedOrg),
    }));
  }, [contactsQuery.data?.data, organizationType, trimmedOrg]);

  const createMutation = useMutation({
    mutationFn: () => contactsService.create({
      fullName: form.fullName.trim(),
      jobTitle: form.jobTitle.trim() || null,
      department: form.department.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      organizationType,
      organizationName: trimmedOrg || null,
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

  const choose = (contact: ContactSummary, eligible: boolean, reason: string | null) => {
    if (selected.has(contact.id)) {
      toast.info('This contact is already selected');
      return;
    }
    if (!eligible) {
      toast.error(reason || 'This contact cannot be used here');
      return;
    }
    onSelect(contact);
    setOpen(false);
    setCreateOpen(false);
    setDuplicates([]);
  };

  const scopeLabel = scope === 'directory'
    ? 'Shared contacts directory'
    : scope === 'organization' && trimmedOrg
      ? trimmedOrg
      : `Eligible ${organizationType} contacts`;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Popover open={open} onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery('');
            setDebouncedQuery('');
          } else if (!trimmedOrg) {
            setScope('eligible');
          }
        }}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled} role="combobox">
              <Search className="mr-2 h-4 w-4" /> Select Existing Contact
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(28rem,var(--radix-popover-content-available-width))] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search name, email, phone, or organization…"
                value={query}
                onValueChange={setQuery}
              />
              <div className="space-y-2 border-b px-3 py-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{scopeLabel}</span>
                  {contactsQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant={scope === 'eligible' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setScope('eligible')}
                  >
                    Eligible contacts
                  </Button>
                  {trimmedOrg && (
                    <Button
                      type="button"
                      variant={scope === 'organization' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setScope('organization')}
                    >
                      This organization
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={scope === 'directory' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setScope('directory')}
                  >
                    Search shared directory
                  </Button>
                </div>
              </div>
              <CommandList>
                {contactsQuery.isError ? (
                  <div className="px-3 py-6 text-center text-sm text-destructive" role="alert">
                    {emptyMessage(scope, organizationType, organizationName, true, false)}
                    <div className="mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => contactsQuery.refetch()}>
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>
                      <div className="space-y-2 px-2">
                        <p>
                          {emptyMessage(
                            scope,
                            organizationType,
                            organizationName,
                            false,
                            contactsQuery.isFetching,
                          )}
                        </p>
                        {scope !== 'directory' && !contactsQuery.isFetching && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setScope('directory')}
                          >
                            Search shared directory
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {rows.map(({ contact, compatibility }) => {
                        const alreadySelected = selected.has(contact.id);
                        const disabledItem = alreadySelected || !compatibility.eligible;
                        return (
                          <CommandItem
                            key={contact.id}
                            value={`${contact.id} ${contact.fullName ?? ''} ${contact.email ?? ''} ${contact.organizationName ?? ''}`}
                            onSelect={() => choose(contact, compatibility.eligible, compatibility.reason)}
                            disabled={disabledItem}
                            className={cn(!compatibility.eligible && 'opacity-70')}
                          >
                            <Check className={cn('mr-2 h-4 w-4', alreadySelected ? 'opacity-100' : 'opacity-0')} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium">
                                  {contact.fullName || contact.email || contact.phone || 'Unnamed contact'}
                                </p>
                                {compatibility.organizationMatch && (
                                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                                    Same organization
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {[contact.jobTitle, contact.organizationName, contact.email, contact.phone]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                              {!compatibility.eligible && compatibility.reason && (
                                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                  {compatibility.reason}
                                </p>
                              )}
                              {alreadySelected && (
                                <p className="mt-1 text-xs text-muted-foreground">Already selected</p>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
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
              {duplicates.map((contact) => {
                const compatibility = evaluateContactCompatibility(contact, organizationType, trimmedOrg);
                return (
                  <Button
                    key={contact.id}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start px-2 py-1"
                    onClick={() => choose(contact, compatibility.eligible, compatibility.reason)}
                  >
                    <span className="text-left">
                      Use {contact.fullName || contact.email || contact.phone}
                      {!compatibility.eligible && compatibility.reason ? (
                        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">{compatibility.reason}</span>
                      ) : null}
                    </span>
                  </Button>
                );
              })}
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
