import { useQuery } from '@tanstack/react-query';
import {
  getChaptersByCollection,
  getChapter,
  getHadithsByChapter,
  type HadithChapterMeta,
  type HadithChapter,
  type Hadith,
} from 'Server/API/Hadith';

export function useHadithChapters(collectionId: string) {
  return useQuery<HadithChapterMeta[], Error>({
    queryKey: ['hadith-chapters', collectionId],
    queryFn: () => getChaptersByCollection(collectionId),
    staleTime: 1000 * 60 * 60,
    enabled: !!collectionId,
  });
}

export function useHadithChapter(collectionId: string, chapterId: string) {
  return useQuery<HadithChapter | null, Error>({
    queryKey: ['hadith-chapter', collectionId, chapterId],
    queryFn: () => getChapter(collectionId, chapterId),
    staleTime: 1000 * 60 * 60,
    enabled: !!collectionId && !!chapterId,
  });
}

export function useHadithsByChapter(collectionId: string, chapterId: string) {
  return useQuery<Hadith[], Error>({
    queryKey: ['hadith-hadith', collectionId, chapterId],
    queryFn: () => getHadithsByChapter(collectionId, chapterId),
    staleTime: 1000 * 60 * 60,
    enabled: !!collectionId && !!chapterId,
  });
}
