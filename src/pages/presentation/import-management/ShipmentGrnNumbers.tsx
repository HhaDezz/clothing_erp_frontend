import React from 'react';
import { useQueries } from '@tanstack/react-query';
import {
	ImportShipmentResponse,
	ImportShipmentWarehouseLegResponse,
	getImportWarehouseLegsApi,
} from '../../../api/importShipments.api';

/**
 * A shipment's GRN number(s) for list pages.
 * <p>
 * A shipment used to have exactly one GRN (`shipment.grn`). Since stock can
 * be split across warehouses, each warehouse leg now generates its own GRN,
 * and `shipment.grn` is only ever filled on old, pre-split shipments — so a
 * "GRN No" column reading it shows nothing for every current shipment. The
 * real numbers live on the legs, which the shipment list endpoint does not
 * include; this loads them per shipment (same query key as the detail
 * drawer, so the two share a cache).
 */

export type ShipmentGrn = { grnNo: string; warehouseName: string | null };

export type ShipmentGrnLookup = {
	/** Every GRN on the shipment, one per warehouse leg that has generated one. */
	grnsFor: (shipment: ImportShipmentResponse) => ShipmentGrn[];
	/** "GRN-1, GRN-2" — for the table's search, sort and export. */
	grnTextFor: (shipment: ImportShipmentResponse) => string;
	isLoadingFor: (shipment: ImportShipmentResponse) => boolean;
};

export const useShipmentGrnNumbers = (shipments: ImportShipmentResponse[]): ShipmentGrnLookup => {
	const results = useQueries({
		queries: shipments.map((shipment) => ({
			queryKey: ['importShipmentWarehouseLegs', shipment.id],
			queryFn: () => getImportWarehouseLegsApi(shipment.id),
		})),
	});

	const indexById = new Map<number, number>();
	shipments.forEach((shipment, index) => indexById.set(shipment.id, index));

	const grnsFor = (shipment: ImportShipmentResponse): ShipmentGrn[] => {
		const index = indexById.get(shipment.id);
		const legs = (index !== undefined ? results[index]?.data : undefined) as
			| ImportShipmentWarehouseLegResponse[]
			| undefined;
		const fromLegs = (legs ?? [])
			.filter((leg) => Boolean(leg.grnNo))
			.map((leg) => ({ grnNo: leg.grnNo as string, warehouseName: leg.warehouseName }));
		if (fromLegs.length > 0) return fromLegs;
		// Old shipment received before per-warehouse GRNs existed.
		return shipment.grn?.grnNo ? [{ grnNo: shipment.grn.grnNo, warehouseName: null }] : [];
	};

	return {
		grnsFor,
		grnTextFor: (shipment) =>
			grnsFor(shipment)
				.map((grn) => grn.grnNo)
				.join(', '),
		isLoadingFor: (shipment) => {
			const index = indexById.get(shipment.id);
			return index !== undefined ? Boolean(results[index]?.isLoading) : false;
		},
	};
};

/** The table cell: one line per GRN, each with the warehouse it belongs to. */
export const ShipmentGrnCell: React.FC<{ grns: ShipmentGrn[]; isLoading: boolean }> = ({ grns, isLoading }) => {
	if (grns.length === 0) {
		return <span className='text-muted fst-italic'>{isLoading ? 'Loading...' : '—'}</span>;
	}
	return (
		<div>
			{grns.map((grn) => (
				<div key={grn.grnNo}>
					<span className='fw-semibold'>{grn.grnNo}</span>
					{grn.warehouseName && (
						<span className='text-muted small ms-2'>{grn.warehouseName}</span>
					)}
				</div>
			))}
		</div>
	);
};
