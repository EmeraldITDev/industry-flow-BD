import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectContact, ProjectContactRole } from "@/types";
import { Plus, Star, Trash2 } from "lucide-react";

const roles: { value: ProjectContactRole; label: string }[] = [
  { value: "procurement", label: "Procurement" },
  { value: "technical", label: "Technical" },
  { value: "commercial", label: "Commercial" },
  { value: "finance", label: "Finance" },
  { value: "project_coordinator", label: "Project Coordinator" },
  { value: "other", label: "Other" },
];

interface Props {
  contacts: ProjectContact[];
  onChange: (contacts: ProjectContact[]) => void;
}

const newContact = (isPrimary: boolean): ProjectContact => ({
  name: "",
  jobTitle: "",
  department: "",
  email: "",
  phone: "",
  contactRole: "other",
  isPrimary,
  notes: "",
});

export function ProjectContactsEditor({ contacts, onChange }: Props) {
  const updateContact = (index: number, patch: Partial<ProjectContact>) => {
    onChange(contacts.map((contact, i) => i === index ? { ...contact, ...patch } : contact));
  };

  const setPrimary = (index: number) => {
    onChange(contacts.map((contact, i) => ({ ...contact, isPrimary: i === index })));
  };

  const removeContact = (index: number) => {
    const remaining = contacts.filter((_, i) => i !== index);
    if (contacts[index]?.isPrimary && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    onChange(remaining);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Project Contacts</h3>
          <p className="text-sm text-muted-foreground">
            Add the client contacts involved in this opportunity. One contact must be primary.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => onChange([...contacts, newContact(contacts.length === 0)])}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No project contacts added.
        </p>
      ) : (
        contacts.map((contact, index) => {
          const isLegacyWithoutName = Boolean(contact.id && !contact.name.trim() && (contact.email || contact.phone));
          return (
            <Card key={contact.id ?? `new-${index}`} className="bg-muted/20">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Contact {index + 1}</span>
                    {contact.isPrimary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        <Star className="h-3 w-3 fill-current" /> Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!contact.isPrimary && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setPrimary(index)}>
                        Set as primary
                      </Button>
                    )}
                    <Button type="button" size="icon" variant="ghost" aria-label={`Remove contact ${index + 1}`} onClick={() => removeContact(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isLegacyWithoutName && (
                  <p className="text-xs text-muted-foreground">
                    This contact was migrated from the legacy contact field; the original record did not include a name.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`contact-name-${index}`}>Full Name{!isLegacyWithoutName && " *"}</Label>
                    <Input
                      id={`contact-name-${index}`}
                      value={contact.name}
                      required={!isLegacyWithoutName}
                      onChange={(event) => updateContact(index, { name: event.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`contact-title-${index}`}>Job Title / Position</Label>
                    <Input id={`contact-title-${index}`} value={contact.jobTitle} onChange={(event) => updateContact(index, { jobTitle: event.target.value })} placeholder="e.g. Procurement Manager" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`contact-department-${index}`}>Department</Label>
                    <Input id={`contact-department-${index}`} value={contact.department} onChange={(event) => updateContact(index, { department: event.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`contact-email-${index}`}>Email Address</Label>
                    <Input id={`contact-email-${index}`} type="email" value={contact.email} onChange={(event) => updateContact(index, { email: event.target.value })} placeholder="name@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`contact-phone-${index}`}>Phone Number</Label>
                    <Input id={`contact-phone-${index}`} type="tel" pattern="^[+0-9\s().-]{7,25}$" value={contact.phone} onChange={(event) => updateContact(index, { phone: event.target.value })} placeholder="+234 800 000 0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`contact-role-${index}`}>Contact Role</Label>
                    <Select value={contact.contactRole} onValueChange={(value: ProjectContactRole) => updateContact(index, { contactRole: value })}>
                      <SelectTrigger id={`contact-role-${index}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`contact-notes-${index}`}>Notes</Label>
                  <Textarea id={`contact-notes-${index}`} value={contact.notes} onChange={(event) => updateContact(index, { notes: event.target.value })} placeholder="Optional context for this project" rows={2} />
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
