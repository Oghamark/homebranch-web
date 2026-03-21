import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { config } from '@/shared';
import { homebranchApi } from '@/shared/api/rtk-query';

type JobStreamEvent = { type: string };

export function useJobStream() {
    const dispatch = useDispatch();

    useEffect(() => {
        const eventSource = new EventSource(`${config.apiUrl}/jobs/stream`, {withCredentials: true});

        eventSource.onmessage = (event: MessageEvent<string>) => {
            let payload: JobStreamEvent;
            try {
                payload = JSON.parse(event.data) as JobStreamEvent;
            } catch {
                return;
            }

            if (payload.type !== 'heartbeat') {
                dispatch(homebranchApi.util.invalidateTags(['Job']));
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [dispatch]);
}
