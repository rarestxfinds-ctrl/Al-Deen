import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@Web/Component/UI/Button";
import { Container } from "@Web/Component/UI/Container";
import { FileText, Trash2 } from "lucide-react";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

interface NotesTabProps {
  notes: any[];
  isLoading: boolean;
  deleteNote: (id: string) => Promise<void>;
  setSettingsSidebarOpen: (open: boolean) => void;
}

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

export function NotesTab({
  notes,
  isLoading,
  deleteNote,
  setSettingsSidebarOpen,
}: NotesTabProps) {
  // Pull core structural layout map over client cache layers
  const { data: corpus, isLoading: isCorpusLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);

  if (isLoading || isCorpusLoading) return null;

  if (notes.length === 0) {
    return (
      <Container className="text-center py-6">
        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No notes yet</p>
      </Container>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => {
        const surah = surahList.find((s: any) => s.id === note.surah_id);
        return (
          <Container key={note.id} className="!p-3 group relative">
            <Link
              to={`/Quran/Surah/${note.surah_id}${note.ayah_id ? `?verse=${note.ayah_id}` : ""}`}
              onClick={() => setSettingsSidebarOpen(false)}
              className="block"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-primary">
                  {surah?.englishName || `Surah ${note.surah_id}`} {note.ayah_id ? `${note.surah_id}:${note.ayah_id}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(note.updated_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{note.content}</p>
            </Link>
            <Button
              onClick={() => deleteNote(note.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0 rounded-full"
              size="sm"
              variant="secondary"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </Container>
        );
      })}
    </div>
  );
}