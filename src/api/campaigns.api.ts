import api from '../lib/axios';

export type CampaignChannel = 'SMS' | 'EMAIL';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';

export type CampaignRecipientStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export type Campaign = {
	id: number;
	name: string;
	segmentId: number | null;
	segmentName: string | null;
	channel: CampaignChannel;
	subject: string | null;
	body: string;
	status: CampaignStatus;
	scheduledAt: string | null;
	startedAt: string | null;
	finishedAt: string | null;
	totalCount: number | null;
	sentCount: number | null;
	failedCount: number | null;
	skippedCount: number | null;
	createdByName: string | null;
	createdAt: string;
};

export type CampaignPayload = {
	name: string;
	segmentId: number;
	channel: CampaignChannel;
	/** Email only; ignored for SMS. Falls back to the campaign name if blank. */
	subject?: string;
	/**
	 * Supports {{firstName}}, {{fullName}}, {{points}} and {{storeCredit}}.
	 * An opt-out line is appended automatically — do not write one in.
	 */
	body: string;
	/** When to start sending. Null/omitted means as soon as it is queued. */
	scheduledAt?: string | null;
};

/** One line of the delivery log — who was reached, who was not, and why. */
export type CampaignRecipient = {
	id: number;
	customerId: number;
	customerName: string;
	/** The address actually used, snapshotted at queue time. */
	destination: string | null;
	status: CampaignRecipientStatus;
	error: string | null;
	attempts: number | null;
	sentAt: string | null;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export const getCampaignsApi = () => api.get<ApiResponse<Campaign[]>>('/campaigns').then((res) => res.data.data);

export const getCampaignByIdApi = (id: number | string) =>
	api.get<ApiResponse<Campaign>>(`/campaigns/${id}`).then((res) => res.data.data);

export const createCampaignApi = (payload: CampaignPayload) =>
	api.post<ApiResponse<Campaign>>('/campaigns', payload).then((res) => res.data.data);

export const updateCampaignApi = (id: number | string, payload: CampaignPayload) =>
	api.put<ApiResponse<Campaign>>(`/campaigns/${id}`, payload).then((res) => res.data.data);

export const deleteCampaignApi = (id: number | string) =>
	api.delete<ApiResponse<void>>(`/campaigns/${id}`).then((res) => res.data);

/** Resolves the segment, writes the recipient rows, and hands the campaign to the dispatcher. */
export const queueCampaignApi = (id: number | string) =>
	api.post<ApiResponse<Campaign>>(`/campaigns/${id}/queue`).then((res) => res.data.data);

/** Stops a campaign. Whatever has already gone out has gone out. */
export const cancelCampaignApi = (id: number | string) =>
	api.post<ApiResponse<Campaign>>(`/campaigns/${id}/cancel`).then((res) => res.data.data);

export const getCampaignLogApi = (id: number | string, status?: CampaignRecipientStatus) =>
	api
		.get<ApiResponse<CampaignRecipient[]>>(`/campaigns/${id}/log`, {
			params: status ? { status } : undefined,
		})
		.then((res) => res.data.data);

/** For when a customer asks a member of staff to opt them out, rather than clicking the link. */
export const unsubscribeCustomerApi = (customerId: number | string, channel?: CampaignChannel) =>
	api
		.post<ApiResponse<void>>(`/campaigns/unsubscribe/${customerId}`, null, {
			params: channel ? { channel } : undefined,
		})
		.then((res) => res.data);
