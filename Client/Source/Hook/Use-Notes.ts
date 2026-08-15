import { useState, useEffect } from "react";
import { supabase } from "@/Integration/supabase/client";
import { useAuth } from "@Web/Context/Auth";
import { toast } from "@/Hook/Use-Toast";

interface Note {
  id: string;
  surah_id: number;
  ayah_id: number | null;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotes = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async (surahId: number, content: string, ayahId?: number, isPrivate: boolean = true) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save notes",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if note already exists
      const existingNote = notes.find(
        (n) => n.surah_id === surahId && n.ayah_id === (ayahId || null)
      );

      if (existingNote) {
        const { error } = await supabase
          .from("notes")
          .update({ content, is_private: isPrivate })
          .eq("id", existingNote.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").insert({
          user_id: user.id,
          surah_id: surahId,
          ayah_id: ayahId || null,
          content,
          is_private: isPrivate,
        });

        if (error) throw error;
      }

      toast({
        title: "Note saved",
        description: "Your note has been saved privately",
      });
      
      await fetchNotes();
      return true;
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      toast({
        title: "Note deleted",
      });
      
      await fetchNotes();
      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  };

  const getNote = (surahId: number, ayahId?: number) => {
    return notes.find(
      (n) => n.surah_id === surahId && n.ayah_id === (ayahId || null)
    );
  };

  useEffect(() => {
    fetchNotes();
  }, [user]);

  return {
    notes,
    isLoading,
    saveNote,
    deleteNote,
    getNote,
    refetch: fetchNotes,
  };
}