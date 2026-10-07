import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
	getNotificationsApi,
	getUnreadCountApi,
	markAllReadApi,
	markReadApi,
	NotificationResponse,
	Department,
} from '../api/notifications.api';

const WS_URL = 'http://localhost:8089/ws';

/**
 * Connects to the ERP WebSocket server and subscribes to department-specific
 * notification topics, plus permission-scoped ones for audiences that aren't
 * modeled as a Department (e.g. Director/System Admin holders of
 * import-higher-approve — see "Import Process Implementation Plan" doc,
 * Phase 5). Falls back to REST polling on connection failure.
 */
export function useNotifications(departments: Department[], permissions: string[] = []) {
	const queryClient = useQueryClient();
	const clientRef = useRef<Client | null>(null);
	const [connected, setConnected] = useState(false);

	const hasAudience = departments.length > 0 || permissions.length > 0;

	const { data: notifications = [], isLoading } = useQuery({
		queryKey: ['notifications'],
		queryFn: getNotificationsApi,
		enabled: hasAudience,
	});

	const { data: unreadCount = 0 } = useQuery({
		queryKey: ['notifications-unread'],
		queryFn: getUnreadCountApi,
		enabled: hasAudience,
		// Fallback polling when WebSocket is not connected
		refetchInterval: connected ? false : 30000,
	});

	// Connect WebSocket and subscribe to each department's + permission's topic
	useEffect(() => {
		if (!hasAudience) return;

		const client = new Client({
			webSocketFactory: () => new SockJS(WS_URL) as any,
			reconnectDelay: 5000,
			onConnect: () => {
				setConnected(true);
				const onPush = (_message: IMessage) => {
					// Invalidate both queries on new push notification
					queryClient.invalidateQueries({ queryKey: ['notifications'] });
					queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
				};
				departments.forEach((dept) => {
					client.subscribe(`/topic/notifications/${dept}`, onPush);
				});
				permissions.forEach((permission) => {
					client.subscribe(`/topic/notifications/permission/${permission}`, onPush);
				});
			},
			onDisconnect: () => setConnected(false),
			onStompError: () => setConnected(false),
		});

		client.activate();
		clientRef.current = client;

		return () => {
			client.deactivate();
		};
	}, [departments.join(','), permissions.join(','), queryClient]);

	const markRead = useCallback(
		async (id: number) => {
			await markReadApi(id);
			queryClient.invalidateQueries({ queryKey: ['notifications'] });
			queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
		},
		[queryClient],
	);

	const markAllRead = useCallback(async () => {
		await markAllReadApi();
		queryClient.invalidateQueries({ queryKey: ['notifications'] });
		queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
	}, [queryClient]);

	return { notifications, unreadCount, isLoading, connected, markRead, markAllRead };
}
