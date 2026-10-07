import { NotificationResponse } from '../api/notifications.api';

/**
 * Maps a notification to the master list page where its underlying record
 * lives, with `?open=<id>` telling that page to auto-select the row and open
 * its "View Details" drawer — see NotificationBell.tsx's click handler and
 * each target page's `open` query-param effect.
 *
 * Purchase Inquiries and Import Shipments each have a single master list
 * that every department involved in that workflow can view (status/actions
 * on each row already adapt to the viewer's permissions), so every
 * PURCHASE_INQUIRY / IMPORT_SHIPMENT notification lands there regardless of
 * which department it was sent to.
 *
 * Goods Transfer Requests don't have one master list — the workflow is
 * split across three department-specific pages (showroom / SL Operations /
 * warehouse), so that one is routed by the notification's recipientDept.
 *
 * Returns null when there's nothing to navigate to (no entityType/entityId,
 * or an entityType this map doesn't know about yet) — the caller should
 * just mark the notification read in that case, without navigating.
 */
export const getNotificationRoute = (n: NotificationResponse): string | null => {
	if (!n.entityType || n.entityId == null) return null;

	switch (n.entityType) {
		case 'PURCHASE_INQUIRY':
			return `/purchasing/inquiries?open=${n.entityId}`;

		case 'IMPORT_SHIPMENT':
			return `/import/shipments?open=${n.entityId}`;

		case 'GOODS_TRANSFER_REQUEST': {
			const base =
				n.recipientDept === 'SL_OPERATIONS'
					? '/goods-transfer/review'
					: n.recipientDept === 'WAREHOUSE'
						? '/goods-transfer/warehouse'
						: '/goods-transfer/requests';
			return `${base}?open=${n.entityId}`;
		}

		default:
			return null;
	}
};
