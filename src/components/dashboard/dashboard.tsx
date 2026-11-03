"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Layers, Plus, Search, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { CreateTimelineDialog } from "@/components/dashboard/create-timeline-dialog";
import { TimelineCard } from "@/components/dashboard/timeline-card";
import { api, errorMessage } from "@/lib/client/api";
import type { TimelineSummary } from "@/types/api";

type Tab = "active" | "trash";
type Pending = { kind: "trash" | "delete"; timeline: TimelineSummary } | null;

export function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("active");
  const [active, setActive] = useState<TimelineSummary[] | null>(null);
  const [trash, setTrash] = useState<TimelineSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [a, t] = await Promise.all([api.get<TimelineSummary[]>("/api/timelines"), api.get<TimelineSummary[]>("/api/timelines?trash=1")]);
      setActive(a);
      setTrash(t);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const list = tab === "active" ? active : trash;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!list || !q) return list;
    return list.filter((t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
  }, [list, query]);

  const rename = async (id: string, name: string) => {
    const updated = await api.patch<TimelineSummary>(`/api/timelines/${id}`, { name });
    setActive((l) => l?.map((t) => (t.id === id ? { ...t, name: updated.name, updatedAt: updated.updatedAt } : t)) ?? l);
  };

  const restore = async (timeline: TimelineSummary) => {
    try {
      await api.post(`/api/timelines/${timeline.id}/restore`);
      toast.success(`Restored "${timeline.name}".`);
      await load();
    } catch (error) {
      toast.error("Could not restore the timeline", { description: errorMessage(error) });
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, timeline } = pending;
    if (kind === "trash") await api.post(`/api/timelines/${timeline.id}/trash`);
    else await api.delete(`/api/timelines/${timeline.id}`);
    toast.success(kind === "trash" ? `Moved "${timeline.name}" to the trash.` : `Deleted "${timeline.name}" permanently.`);
    await load();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg">Your timelines</h1>
            <p className="mt-1 text-fg-muted">Create, organise and open your historical timelines.</p>
          </div>
          <Button variant="primary" icon={Plus} size="lg" onClick={() => setCreating(true)}>New timeline</Button>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs<Tab>
            label="Timeline lists"
            value={tab}
            onChange={setTab}
            items={[
              { value: "active", label: "Active", icon: Layers, badge: active?.length },
              { value: "trash", label: "Trash", icon: Archive, badge: trash?.length },
            ]}
          />
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <Input type="search" aria-label="Search timelines" placeholder="Search by name or description" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <TabPanel className="mt-6">
          {loadError ? (
            <ErrorState title="Your timelines could not be loaded" description={loadError} action={<Button variant="primary" onClick={load}>Try again</Button>} />
          ) : filtered === null ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              <span className="sr-only" role="status">Loading timelines</span>
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            query.trim() ? (
              <EmptyState icon={Search} title="No matching timelines" description={`Nothing matches "${query.trim()}". Try a different search.`} action={<Button onClick={() => setQuery("")}>Clear search</Button>} />
            ) : tab === "active" ? (
              <EmptyState
                icon={Layers}
                title="Start your first timeline"
                description="Plot events, eras and periods from antiquity to today on a single number line."
                action={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New timeline</Button>}
              />
            ) : (
              <EmptyState icon={Trash2} title="The trash is empty" description="Timelines you move to the trash stay here until you restore them or delete them permanently." />
            )
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <li key={t.id}>
                  <TimelineCard
                    timeline={t}
                    onRename={(name) => rename(t.id, name)}
                    onTrash={() => setPending({ kind: "trash", timeline: t })}
                    onRestore={() => void restore(t)}
                    onDelete={() => setPending({ kind: "delete", timeline: t })}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      </main>
      <SiteFooter />

      {creating && (
        <CreateTimelineDialog
          onClose={() => setCreating(false)}
          onCreated={(t) => router.push(`/timeline/${t.id}`)}
        />
      )}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === "delete" ? "Delete permanently?" : "Move to trash?"}
        message={
          pending?.kind === "delete"
            ? <>&ldquo;{pending.timeline.name}&rdquo; and all its events will be erased. This cannot be undone.</>
            : <>&ldquo;{pending?.timeline.name}&rdquo; moves to the Trash tab. You can restore it later.</>
        }
        confirmLabel={pending?.kind === "delete" ? "Delete permanently" : "Move to trash"}
        cancelLabel="Keep timeline"
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
