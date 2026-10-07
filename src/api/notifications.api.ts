import api from '../lib/axios';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type Department = 'SL_OPERATIONS' | 'PROCUREMENT' | 'FINANCE' | 'WAREHOUSE' | 'SHOWROOM';

export type NotificationResponse = {
	id: number;
	// A notification targets either a Department OR a permission (e.g.
	// Director/System Admin holders of import-higher-approve, who aren't
	// modeled as a Department) — exactly one of the two is set.
	recipientDept: Department | null;
	targetPermission: string | null;
	title: string;
	message: string;
	entityType: string | null;
	entityId: number | null;
	read: boolean;
	createdAt: string;
};

export const getNotificationsApi = () =>
	api.get<ApiResponse<NotificationResponse[]>>('/notifications').then((r) => r.data.data);

export const getUnreadCountApi = () =>
	api.get<ApiResponse<number>>('/notifications/unread-count').then((r) => r.data.data);

export const markReadApi = (id: number) =>
	api.put<ApiResponse<void>>(`/notifications/${id}/read`).then((r) => r.data);

export const markAllReadApi = () =>
	api.put<ApiResponse<void>>('/notifications/read-all').then((r) => r.data);
