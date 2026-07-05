import { useEffect, RefObject } from 'react';

interface CopyInterceptorProps {
  containerId: string;
  standardWordsMapRef: RefObject<Map<number, string[]>>;
}

export function useCopyInterceptor({ containerId, standardWordsMapRef }: CopyInterceptorProps) {
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const container = document.getElementById(containerId);
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      if (!container.contains(commonAncestor)) return;

      // Collect all word spans that are inside the selection
      const wordSpans: HTMLElement[] = [];
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            const el = node as HTMLElement;
            if (el.hasAttribute('data-verse') && el.hasAttribute('data-word')) {
              if (selection.containsNode(el, true)) {
                return NodeFilter.FILTER_ACCEPT;
              }
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      while (walker.nextNode()) {
        wordSpans.push(walker.currentNode as HTMLElement);
      }

      if (wordSpans.length === 0) return;

      const standardMap = standardWordsMapRef.current;
      if (!standardMap) {
        console.warn('Standard words map not available for copy');
        return;
      }

      // Build standard Arabic text from the selected spans
      const standardParts: string[] = [];
      for (const span of wordSpans) {
        const verse = parseInt(span.getAttribute('data-verse')!);
        const wordIdx = parseInt(span.getAttribute('data-word')!);
        const verseWords = standardMap.get(verse);
        if (verseWords && verseWords[wordIdx]) {
          standardParts.push(verseWords[wordIdx]);
        } else {
          // Fallback to the displayed text (should never happen)
          standardParts.push(span.textContent?.trim() || '');
        }
      }

      const standardText = standardParts.join(' ');
      e.clipboardData?.setData('text/plain', standardText);
      e.preventDefault();
      console.log('📋 Copied standard Arabic:', standardText);
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [containerId, standardWordsMapRef]);
}