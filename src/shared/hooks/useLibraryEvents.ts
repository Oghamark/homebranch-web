import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { config } from '@/shared';
import { homebranchApi } from '@/shared/api/rtk-query';

type LibraryEvent =
  | { type: 'book-added'; bookId: string }
  | { type: 'book-removed'; bookId: string }
  | { type: 'book-updated'; bookId: string }
  | { type: 'heartbeat' };

export function useLibraryEvents() {
  const dispatch = useDispatch();

  useEffect(() => {
    const eventSource = new EventSource(`${config.apiUrl}/library/events`);

    eventSource.onmessage = (event: MessageEvent<string>) => {
      let payload: LibraryEvent;
      try {
        payload = JSON.parse(event.data) as LibraryEvent;
      } catch {
        return;
      }

      switch (payload.type) {
        case 'book-added':
          dispatch(
            homebranchApi.util.invalidateTags([
              { type: 'Book', id: 'LIST' },
              'Author', // new book may introduce a new author
            ]),
          );
          break;
        case 'book-removed':
          dispatch(
            homebranchApi.util.invalidateTags([
              { type: 'Book', id: payload.bookId },
              { type: 'Book', id: 'LIST' },
              'Author',    // book removal may affect author listings
              'BookShelf', // book is no longer accessible from any shelf
            ]),
          );
          break;
        case 'book-updated':
          dispatch(
            homebranchApi.util.invalidateTags([
              { type: 'Book', id: payload.bookId },
              'Author',    // author name may have changed
              'BookShelf', // shelf pages embed full book data (title, cover, etc.)
            ]),
          );
          break;
        case 'heartbeat':
          break;
      }
    };

    return () => {
      eventSource.close();
    };
  }, [dispatch]);
}
