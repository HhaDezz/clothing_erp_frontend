import api from '../lib/axios';

export type SegmentType = 'RULE' | 'MANUAL';

/**
 * The predicates behind a RULE segment. Every field is optional; every one
 * that is set must hold — rules are ANDed. Mirrors SegmentRules on the
 * backend field-for-field.
 */
export type SegmentRules = {
	// How much they spend
	minTotalSpend?: number | null;
	maxTotalSpend?: number | null;
	minVisitCount?: number | null;
	maxVisitCount?: number | null;
	/** Seen in the last N days — the active customers. */
	lastVisitWithinDays?: number | null;
	/** NOT seen for at least N days — the lapsed ones. */
	lastVisitBeforeDays?: number | null;

	// What they buy
	boughtProductIds?: number[] | null;
	boughtVariantIds?: number[] | null;
	boughtCategories?: string[] | null;
	boughtWithinDays?: number | null;

	// Who they are
	loyaltyTierIds?: number[] | null;
	cities?: string[] | null;
	genders?: string[] | null;
	/** 1–12. */
	birthdayMonths?: number[] | null;

	// What they hold
	minPointsBalance?: number | null;
	hasStoreCredit?: boolean | null;
	owesOnAccount?: boolean | null;

	// Reachability (having an address, not consent — consent is enforced at send time)
	requireEmail?: boolean | null;
	requirePhone?: boolean | null;
};

/** An empty rule set — matches every customer. Used to seed a new segment's builder. */
export const emptySegmentRules = (): SegmentRules => ({});

export type Segment = {
	id: number;
	name: string;
	description: string | null;
	type: SegmentType;
	rules: SegmentRules | null;
	createdByName: string | null;
	createdAt: string;
	/** How many customers are in it right now. Null on the list view — each is a full evaluation. */
	memberCount: number | null;
};

export type SegmentPayload = {
	name: string;
	description?: string;
	/** Defaults to RULE on the backend. */
	type?: SegmentType;
	/** For a RULE segment. Ignored for MANUAL. */
	rules?: SegmentRules;
	/** For a MANUAL segment. Ignored for RULE. */
	memberIds?: number[];
};

export type SegmentPreviewCustomer = {
	id: number;
	name: string;
	phone: string | null;
	email: string | null;
	totalSpend: number | null;
	visitCount: number | null;
	tierName: string | null;
	smsOptIn: boolean;
	emailOptIn: boolean;
};

/** Who a rule set selects. Reachability counts are the number that matters. */
export type SegmentPreview = {
	totalMatched: number;
	reachableByEmail: number;
	reachableBySms: number;
	totalSpendOfSegment: number;
	sample: SegmentPreviewCustomer[];
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export const getSegmentsApi = () => api.get<ApiResponse<Segment[]>>('/segments').then((res) => res.data.data);

export const getSegmentByIdApi = (id: number | string) =>
	api.get<ApiResponse<Segment>>(`/segments/${id}`).then((res) => res.data.data);

export const createSegmentApi = (payload: SegmentPayload) =>
	api.post<ApiResponse<Segment>>('/segments', payload).then((res) => res.data.data);

export const updateSegmentApi = (id: number | string, payload: SegmentPayload) =>
	api.put<ApiResponse<Segment>>(`/segments/${id}`, payload).then((res) => res.data.data);

export const deleteSegmentApi = (id: number | string) =>
	api.delete<ApiResponse<void>>(`/segments/${id}`).then((res) => res.data);

/** Who a saved segment currently selects. */
export const previewSegmentApi = (id: number | string) =>
	api.get<ApiResponse<SegmentPreview>>(`/segments/${id}/preview`).then((res) => res.data.data);

/** Who a rule set WOULD select, without saving it — the builder's live preview. */
export const previewSegmentRulesApi = (rules: SegmentRules) =>
	api.post<ApiResponse<SegmentPreview>>('/segments/preview', rules).then((res) => res.data.data);
