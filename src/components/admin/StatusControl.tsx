import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { CheckCircle2, PauseCircle, Archive } from "lucide-react";

export type ContentStatus = "active" | "inactive" | "archived";

export const STATUS_FILTERS: { value: ContentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

export function StatusBadge({ status }: { status: ContentStatus }) {
  const cfg = {
    active: { label: "Active", cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", Icon: CheckCircle2 },
    inactive: { label: "Inactive", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", Icon: PauseCircle },
    archived: { label: "Archived", cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", Icon: Archive },
  }[status];
  const { Icon } = cfg;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.cls} border-transparent`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

export function StatusControl({
  status,
  onChange,
  label = "item",
  disabled,
}: {
  status: ContentStatus;
  onChange: (next: ContentStatus) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [pendingArchive, setPendingArchive] = useState(false);
  return (
    <>
      <Select
        value={status}
        onValueChange={(v) => {
          const next = v as ContentStatus;
          if (next === "archived" && status !== "archived") setPendingArchive(true);
          else onChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="archived">Archive…</SelectItem>
        </SelectContent>
      </Select>
      <AlertDialog open={pendingArchive} onOpenChange={setPendingArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived {label}s are hidden everywhere except the admin Archive filter. Existing orders and subscriptions keep working.
              You can restore later by switching status back to Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChange("archived")}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function StatusFilterTabs({
  value,
  onChange,
  counts,
}: {
  value: ContentStatus | "all";
  onChange: (v: ContentStatus | "all") => void;
  counts?: Partial<Record<ContentStatus | "all", number>>;
}) {
  return (
    <div className="flex gap-1 rounded-md border bg-card p-1">
      {STATUS_FILTERS.map((f) => (
        <Button
          key={f.value}
          size="sm"
          variant={value === f.value ? "default" : "ghost"}
          className="h-8 text-xs"
          onClick={() => onChange(f.value)}
        >
          {f.label}
          {counts?.[f.value] != null && (
            <span className="ml-1.5 opacity-70">({counts[f.value]})</span>
          )}
        </Button>
      ))}
    </div>
  );
}
