"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useTripStore } from "@/stores/trip-store";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, NotebookPen, FileText } from "lucide-react";
import { Modal, FormField, Button, confirm, EmptyState } from "@/components/ui";

const RichTextEditor = dynamic(
  () => import("@/components/notes/RichTextEditor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 animate-pulse rounded-lg border border-border bg-secondary/30" />
    ),
  }
);

export default function NotesPage() {
  const params = useParams<{ tripId: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === params.tripId));
  const allNotes = useTripStore((s) => s.notes);
  const notes = useMemo(
    () => allNotes.filter((n) => n.tripId === params.tripId),
    [allNotes, params.tripId]
  );
  const addNote = useTripStore((s) => s.addNote);
  const updateNote = useTripStore((s) => s.updateNote);
  const deleteNote = useTripStore((s) => s.deleteNote);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  if (!trip) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (editingId) {
      updateNote(editingId, { title, content });
      setEditingId(null);
    } else {
      addNote({ tripId: trip.id, title, content });
    }
    setTitle("");
    setContent("");
    setShowForm(false);
  };

  const startEdit = (id: string, t: string, c: string) => {
    setEditingId(id);
    setTitle(t);
    setContent(c);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">攻略笔记</h2>
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingId(null);
            setTitle("");
            setContent("");
            setShowForm(true);
          }}
        >
          新建笔记
        </Button>
      </div>

      {/* 笔记列表 */}
      {notes.length === 0 ? (
        <EmptyState icon={<NotebookPen className="h-12 w-12" />} title="还没有笔记" description="记录旅行攻略、心得体会、注意事项等" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <FileText className="h-5 w-5 text-primary" />
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: "删除此笔记？",
                      description: "此操作不可撤销。",
                      confirmText: "删除",
                      variant: "danger",
                    });
                    if (ok) deleteNote(note.id);
                  }}
                  className="rounded p-2 text-muted-foreground opacity-100 transition-opacity hover:text-destructive group-hover:opacity-100 sm:opacity-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mb-2 font-semibold">{note.title}</h3>
              <p className="mb-3 flex-1 text-sm text-muted-foreground line-clamp-4">
                {(note.content ?? "").replace(/<[^>]+>/g, "") || "（空笔记）"}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(note.updatedAt, "short")}</span>
                <button
                  onClick={() => startEdit(note.id, note.title, note.content)}
                  className="font-medium text-primary hover:underline"
                >
                  编辑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 笔记编辑弹窗 */}
      {showForm && (
        <Modal
          open={true}
          onClose={() => setShowForm(false)}
          title={editingId ? "编辑笔记" : "新建笔记"}
          size="lg"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                取消
              </Button>
              <Button variant="primary" size="sm" type="submit" form="note-form">
                {editingId ? "保存" : "创建"}
              </Button>
            </>
          }
        >
          <form id="note-form" onSubmit={handleSubmit} className="space-y-4">
            <FormField label="标题" required>
              {({ id }) => (
                <input
                  id={id}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="笔记标题"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              )}
            </FormField>
            <FormField label="内容">
              {() => (
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="记录旅行攻略、心得体会、注意事项..."
                />
              )}
            </FormField>
          </form>
        </Modal>
      )}
    </div>
  );
}
