import { useRef } from 'react';
import { Paperclip, X, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ProjectDocument } from '@/types';
import { cn } from '@/lib/utils';

const ACCEPT_ATTR =
  '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskAttachmentsFieldProps {
  pendingFiles: File[];
  onPendingChange: (files: File[]) => void;
  existingDocuments?: ProjectDocument[];
  /** Called when user removes a not-yet-saved pending file (no confirmation). */
  onRemovePending?: (index: number) => void;
  /** Called when user requests removal of a saved document (parent shows confirm if needed). */
  onRemoveExisting?: (doc: ProjectDocument) => void;
  disabled?: boolean;
  className?: string;
}

export function TaskAttachmentsField({
  pendingFiles,
  onPendingChange,
  existingDocuments = [],
  onRemovePending,
  onRemoveExisting,
  disabled,
  className,
}: TaskAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next = [...pendingFiles, ...Array.from(list)];
    onPendingChange(next);
    e.target.value = '';
  };

  const removePending = (index: number) => {
    if (onRemovePending) onRemovePending(index);
    else onPendingChange(pendingFiles.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        Attachments
      </Label>
      <p className="text-xs text-muted-foreground">
        PDF, PNG, JPG, DOCX, XLSX, or CSV. You can add multiple files.
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept={ACCEPT_ATTR}
        disabled={disabled}
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Add files
      </Button>

      {existingDocuments.length > 0 && (
        <ul className="space-y-1.5 text-sm border rounded-md p-2 bg-muted/30">
          {existingDocuments.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 text-primary hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{doc.name}</span>
              </a>
              {onRemoveExisting && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onRemoveExisting(doc)}
                  title="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingFiles.length > 0 && (
        <ul className="space-y-1.5 text-sm border rounded-md p-2 border-dashed">
          {pendingFiles.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({formatSize(file.size)})
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removePending(index)}
                title="Remove before save"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
