import { useState, useEffect } from "react";
import { supabase } from "@/Integration/supabase/client";
import { useAuth } from "@Web/Context/Auth";
import { toast } from "@/Hook/Use-Toast";

interface Bookmark {
  id: string;
  surah_id: number;
  ayah_id: number | null;
  note: string | null;
  created_at: string;
}

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookmarks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addBookmark = async (surahId: number, ayahId?: number, note?: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark verses",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        surah_id: surahId,
        ayah_id: ayahId || null,
        note: note || null,
      });

      if (error) throw error;
      
      toast({
        title: "Bookmark added",
        description: "Verse has been bookmarked",
      });
      
      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error("Error adding bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to add bookmark",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      toast({
        title: "Bookmark removed",
      });
      
      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error("Error removing bookmark:", error);
      return false;
    }
  };

  const isBookmarked = (surahId: number, ayahId?: number) => {
    return bookmarks.some(
      (b) => b.surah_id === surahId && (ayahId ? b.ayah_id === ayahId : true)
    );
  };

  const getBookmarkId = (surahId: number, ayahId?: number) => {
    const bookmark = bookmarks.find(
      (b) => b.surah_id === surahId && (ayahId ? b.ayah_id === ayahId : true)
    );
    return bookmark?.id;
  };

  useEffect(() => {
    fetchBookmarks();
  }, [user]);

  return {
    bookmarks,
    isLoading,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmarkId,
    refetch: fetchBookmarks,
  };
}