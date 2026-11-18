import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/usePermissions';
import {
  contactsService,
  type ContactDetail,
  type ContactInput,
  type ContactSummary,
  type ContactType,
} from '@/services/contacts';

const ALL = 'all';

const emptyContact = (): ContactInput => ({
  fullName: '',
  jobTitle: '',
  department: '',
  email: '',
  phone: '',
  notes: '',
  isActive: true,
  organizationType: null,
  organizationName: '',
});

export default function Contacts() {
  const queryClient = useQueryClient();
  const { canCreatePartners, canEditPartners } = usePermissions();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<ContactType | typeof ALL>(ALL);
  const [organizationKey, setOrganizationKey] = useState(ALL);
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ContactSummary | null | 'new'>(null);
  const [form, setForm] = useState<ContactInput>(emptyContact());
  const [identity, setIdentity] = useState({ email: '', phone: '' });
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIdentity({
      email: form.email?.trim() ?? '',
      phone: form.phone?.trim() ?? '',
    }), 400);
    return () => window.clearTimeout(timer);
  }, [form.email, form.phone]);

  const organizationsQuery = useQuery({
    queryKey: ['contact-organizations'],
    queryFn: contactsService.organizations,
    staleTime: 5 * 60 * 1000,
  });
  const organizationOptions = organizationsQuery.data ?? [];
  const selectedOrganization = organizationOptions.find(
    (row) => `${row.type}|${row.name}` === organizationKey,
  );

  const contactsQuery = useQuery({
    queryKey: ['contacts', debouncedSearch, type, organizationKey, duplicatesOnly, page],
    queryFn: () => contactsService.list({
      search: debouncedSearch || undefined,
      type: type === ALL ? selectedOrganization?.type : type,
      organization: selectedOrganization?.name,
      potentialDuplicates: duplicatesOnly,
      page,
      perPage: 25,
    }),
  });

  const duplicateGroupsQuery = useQuery({
    queryKey: ['contact-duplicate-groups'],
    queryFn: contactsService.duplicateGroups,
    staleTime: 60 * 1000,
  });
  const duplicateIds = useMemo(() => new Set(
    (duplicateGroupsQuery.data ?? []).flatMap((group) => group.contacts.map((contact) => contact.id)),
  ), [duplicateGroupsQuery.data]);

  const detailQuery = useQuery({
    queryKey: ['contact', detailId],
    queryFn: () => contactsService.get(detailId!),
    enabled: Boolean(detailId),
  });

  const duplicateSuggestionsQuery = useQuery({
    queryKey: ['contact-duplicate-suggestions', editing === 'new' ? null : editing?.id, identity.email, identity.phone],
    queryFn: () => contactsService.findDuplicates(
      identity.email,
      identity.phone,
      editing === 'new' ? undefined : editing?.id,
    ),
    enabled: Boolean(editing && (identity.email || identity.phone.replace(/\D/g, '').length >= 7)),
    staleTime: 30 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing === 'new'
      ? contactsService.create(form)
      : contactsService.update(editing!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-duplicate-groups'] });
      queryClient.invalidateQueries({ queryKey: ['contact-organizations'] });
      toast.success(editing === 'new' ? 'Contact created' : 'Contact updated');
      setEditing(null);
    },
    onError: (error: unknown) => {
      const errors = (error as {
        response?: { data?: { errors?: Record<string, string | string[]> } };
      })?.response?.data?.errors;
      const first = errors ? Object.values(errors).flat()[0] : null;
      toast.error(typeof first === 'string' ? first : 'Unable to save contact');
    },
  });

  const openCreate = () => {
    setForm(emptyContact());
    setIdentity({ email: '', phone: '' });
    setEditing('new');
  };

  const openEdit = (contact: ContactSummary) => {
    setForm({
      fullName: contact.fullName ?? '',
      jobTitle: contact.jobTitle ?? '',
      department: contact.department ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      notes: contact.notes ?? '',
      isActive: contact.isActive,
      organizationType: contact.organizationType ?? null,
      organizationName: contact.organizationName ?? '',
    });
    setIdentity({ email: contact.email ?? '', phone: contact.phone ?? '' });
    setEditing(contact);
  };

  const contactPage = contactsQuery.data;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Shared client and partner contact directory.</p>
        </div>
        {canCreatePartners && (
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Contact</Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Contact directory</CardTitle>
          <CardDescription>Search contact details and inspect linked opportunities or partner records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_240px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" placeholder="Search name, email, phone, organization" />
            </div>
            <Select value={type} onValueChange={(value) => { setType(value as ContactType | typeof ALL); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                <SelectItem value="client">Client contacts</SelectItem>
                <SelectItem value="partner">Partner contacts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={organizationKey} onValueChange={(value) => { setOrganizationKey(value); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="All organizations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All organizations</SelectItem>
                {organizationOptions.map((row) => (
                  <SelectItem key={`${row.type}|${row.name}`} value={`${row.type}|${row.name}`}>
                    {row.name} ({row.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={duplicatesOnly ? 'default' : 'outline'} onClick={() => { setDuplicatesOnly((value) => !value); setPage(1); }}>
              <AlertTriangle className="mr-2 h-4 w-4" />Potential duplicates
            </Button>
          </div>

          {contactsQuery.isLoading ? (
            <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : contactPage?.data.length ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Contact</TableHead><TableHead>Organization</TableHead><TableHead>Type</TableHead><TableHead>Links</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {contactPage.data.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <button className="text-left" onClick={() => setDetailId(contact.id)}>
                          <span className="font-medium text-primary hover:underline">{contact.fullName || 'Name not recorded'}</span>
                          <span className="block text-xs text-muted-foreground">{contact.jobTitle || contact.email || contact.phone || 'No additional details'}</span>
                        </button>
                        {duplicateIds.has(contact.id) && <Badge variant="outline" className="mt-1 border-amber-400 text-amber-700">Potential duplicate</Badge>}
                      </TableCell>
                      <TableCell>{contact.organizations.join(', ') || '—'}</TableCell>
                      <TableCell className="space-x-1">{contact.types.length ? contact.types.map((value) => <Badge key={value} variant="secondary" className="capitalize">{value}</Badge>) : '—'}</TableCell>
                      <TableCell>{contact.projectsCount} project{contact.projectsCount === 1 ? '' : 's'} · {contact.partnersCount} partner{contact.partnersCount === 1 ? '' : 's'}</TableCell>
                      <TableCell><Badge variant={contact.isActive ? 'default' : 'secondary'}>{contact.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canEditPartners && <Button size="sm" variant="ghost" onClick={() => openEdit(contact)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8" />No contacts match these filters.</div>
          )}

          {contactPage && contactPage.lastPage > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{contactPage.total} contacts</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span>Page {contactPage.currentPage} of {contactPage.lastPage}</span>
                <Button size="sm" variant="outline" disabled={page >= contactPage.lastPage} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ContactFormDialog
        open={Boolean(editing)}
        isNew={editing === 'new'}
        form={form}
        onChange={setForm}
        duplicateSuggestions={duplicateSuggestionsQuery.data ?? []}
        saving={saveMutation.isPending}
        onClose={() => setEditing(null)}
        onSave={() => saveMutation.mutate()}
      />
      <ContactDetailDialog contact={detailQuery.data} loading={detailQuery.isLoading} open={Boolean(detailId)} onClose={() => setDetailId(null)} onEdit={canEditPartners && detailQuery.data ? () => { setDetailId(null); openEdit(detailQuery.data!); } : undefined} />
    </div>
  );
}

function ContactFormDialog({ open, isNew, form, onChange, duplicateSuggestions, saving, onClose, onSave }: {
  open: boolean;
  isNew: boolean;
  form: ContactInput;
  onChange: (form: ContactInput) => void;
  duplicateSuggestions: ContactSummary[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{isNew ? 'Add contact' : 'Edit contact'}</DialogTitle><DialogDescription>Contact details are shared by the central directory. Project and partner assignments are managed separately.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.fullName ?? ''} onChange={(event) => onChange({ ...form, fullName: event.target.value })} /></Field>
          <Field label="Job title / position"><Input value={form.jobTitle ?? ''} onChange={(event) => onChange({ ...form, jobTitle: event.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={(event) => onChange({ ...form, email: event.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ''} onChange={(event) => onChange({ ...form, phone: event.target.value })} /></Field>
          <Field label="Department"><Input value={form.department ?? ''} onChange={(event) => onChange({ ...form, department: event.target.value })} /></Field>
          <Field label="Organization type">
            <Select value={form.organizationType ?? ALL} onValueChange={(value) => onChange({ ...form, organizationType: value === ALL ? null : value as ContactType })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>Not specified</SelectItem><SelectItem value="client">Client</SelectItem><SelectItem value="partner">Partner</SelectItem></SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Organization"><Input value={form.organizationName ?? ''} onChange={(event) => onChange({ ...form, organizationName: event.target.value })} placeholder="Optional organization name" /></Field></div>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={3} value={form.notes ?? ''} onChange={(event) => onChange({ ...form, notes: event.target.value })} /></Field></div>
          <div className="flex items-center gap-3 sm:col-span-2"><Switch checked={form.isActive ?? true} onCheckedChange={(isActive) => onChange({ ...form, isActive })} /><Label>Active contact</Label></div>
        </div>
        {duplicateSuggestions.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Possible existing contact</div>
            {duplicateSuggestions.slice(0, 3).map((contact) => <p key={contact.id}>{contact.fullName || 'Name not recorded'} · {contact.email || contact.phone}</p>)}
            <p className="mt-2 text-xs">Review the matches before saving. Legitimate shared addresses are allowed.</p>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={onSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isNew ? 'Create Contact' : 'Save Changes'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactDetailDialog({ contact, loading, open, onClose, onEdit }: { contact?: ContactDetail; loading: boolean; open: boolean; onClose: () => void; onEdit?: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {loading || !contact ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : <>
          <DialogHeader><DialogTitle>{contact.fullName || 'Name not recorded'}</DialogTitle><DialogDescription>{[contact.jobTitle, contact.department].filter(Boolean).join(' · ') || 'Contact details'}</DialogDescription></DialogHeader>
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Email</span><p>{contact.email || '—'}</p></div><div><span className="text-muted-foreground">Phone</span><p>{contact.phone || '—'}</p></div><div><span className="text-muted-foreground">Organization</span><p>{contact.organizations.join(', ') || '—'}</p></div><div><span className="text-muted-foreground">Status</span><p>{contact.isActive ? 'Active' : 'Inactive'}</p></div></div>
          <section><h3 className="mb-2 font-medium">Linked projects</h3>{contact.projects.length ? <ul className="space-y-2">{contact.projects.map((project) => <li key={project.id} className="rounded-md border p-3"><Link className="font-medium text-primary hover:underline" to={`/projects/${project.id}`}>{project.name}</Link><p className="text-xs text-muted-foreground">{project.clientName || 'No client'}{project.isPrimary ? ' · Primary contact' : ''}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No linked projects.</p>}</section>
          <section><h3 className="mb-2 font-medium">Linked partners</h3>{contact.partners.length ? <ul className="space-y-2">{contact.partners.map((partner) => <li key={partner.id} className="rounded-md border p-3"><Link className="font-medium text-primary hover:underline" to={`/partners/${partner.id}`}>{partner.companyName}</Link><p className="text-xs text-muted-foreground">{partner.relationshipStage || 'No relationship stage'}{partner.isPrimary ? ' · Primary contact' : ''}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No linked partners.</p>}</section>
          {contact.notes && <section><h3 className="mb-1 font-medium">Notes</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{contact.notes}</p></section>}
          <DialogFooter>{onEdit && <Button variant="outline" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}<Button onClick={onClose}>Close</Button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
