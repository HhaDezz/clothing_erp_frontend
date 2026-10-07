import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import DataTable, { DataTableColumn } from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { createImportShipmentFromInquiryApi, getImportShipmentsApi } from '../../../api/importShipments.api';
import {
	getInquiriesApi,
	createInquiryApi,
	updateInquiryApi,
	sendToGfApi,
	markGfConfirmedApi,
	slReconfirmApi,
	financeApproveApi,
	sendPoToGfApi,
	finalizePoApi,
	requestGoodsApi,
	uploadPiApi,
	uploadTtApi,
	PurchaseInquiryResponse,
	PurchaseInquiryPayload,
	INQUIRY_STATUS_LABELS,
	INQUIRY_STATUS_COLORS,
	InquiryStatus,
} from '../../../api/inquiry.api';
import CreateInquiryModal from './CreateInquiryModal';
import InquiryDetailDrawer from './InquiryDetailDrawer';
import { formatCurrency } from '../../../helpers/currency';

const PurchaseInquiriesPage = () => {
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const [searchParams, setSearchParams] = useSearchParams();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedInquiry, setSelectedInquiry] = useState<PurchaseInquiryResponse | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<PurchaseInquiryResponse | null>(null);

	const canCreate = hasPermission(PERMISSIONS.CREATE_INQUIRY);
	const canEdit = hasPermission(PERMISSIONS.UPDATE_INQUIRY);
	// One dedicated permission per status-transition step (see V58) instead
	// of the old shared "submit"/"approve" pair, so each department only
	// needs the specific step it actually performs.
	const canSendGf = hasPermission(PERMISSIONS.SEND_INQUIRY_TO_GF);
	const canGfConfirm = hasPermission(PERMISSIONS.GF_CONFIRM_INQUIRY);
	const canSlReconfirm = hasPermission(PERMISSIONS.SL_RECONFIRM_INQUIRY);
	const canFinanceApprove = hasPermission(PERMISSIONS.FINANCE_APPROVE_INQUIRY);
	const canSendPo = hasPermission(PERMISSIONS.SEND_INQUIRY_PO_TO_GF);
	const canUploadPi = hasPermission(PERMISSIONS.UPLOAD_INQUIRY_PI);
	const canUploadTt = hasPermission(PERMISSIONS.UPLOAD_INQUIRY_TT);
	const canFinalize = hasPermission(PERMISSIONS.FINALIZE_INQUIRY_PO);
	// V60: brand new, standalone permission — not bundled with canFinalize.
	const canRequestGoods = hasPermission(PERMISSIONS.REQUEST_GOODS_INQUIRY);
	const canCreateImportShipment = hasPermission(PERMISSIONS.CREATE_IMPORT_SHIPMENT);

	const { data: inquiries = [], isLoading, error } = useQuery({
		queryKey: ['purchaseInquiries'],
		queryFn: getInquiriesApi,
	});

	// Deep-link support for "go to view" notifications: NotificationBell
	// routes here with ?open=<inquiryId>, so once the list has loaded, find
	// that row and open its detail drawer, then strip the param so a
	// back/refresh doesn't re-trigger it.
	useEffect(() => {
		const openId = searchParams.get('open');
		if (!openId || inquiries.length === 0) return;
		const row = inquiries.find((i) => i.id === Number(openId));
		if (row) {
			setSelectedInquiry(row);
			setIsDetailOpen(true);
		}
		setSearchParams(
			(prev) => {
				prev.delete('open');
				return prev;
			},
			{ replace: true },
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, inquiries]);

	// A PO can only spawn one import shipment (see createImportShipmentMutation) —
	// this tells the row actions which inquiries already have one so "Create
	// Import Shipment" doesn't get offered again.
	const { data: allShipments = [] } = useQuery({
		queryKey: ['importShipments'],
		queryFn: getImportShipmentsApi,
	});
	const inquiriesWithShipment = new Set(
		allShipments.filter((s) => s.sourceInquiryId != null).map((s) => s.sourceInquiryId),
	);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchaseInquiries'] });

	const createMutation = useMutation({
		mutationFn: createInquiryApi,
		onSuccess: () => {
			invalidate();
			setIsModalOpen(false);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Inquiry Created</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to create inquiry'), 'danger'),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: PurchaseInquiryPayload }) =>
			updateInquiryApi(id, payload),
		onSuccess: () => {
			invalidate();
			setIsModalOpen(false);
			setEditTarget(null);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Inquiry Updated</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to update'), 'danger'),
	});

	// Generic status mutation factory
	const makeStatusMutation = (fn: (id: number) => Promise<PurchaseInquiryResponse>, label: string) =>
		useMutation({
			mutationFn: fn,
			onSuccess: () => {
				invalidate();
				showNotification(<><Icon icon='CheckCircle' className='me-2' />{label}</>, '', 'success');
			},
			onError: (e) => showNotification('Error', getApiErrorMessage(e, `Failed: ${label}`), 'danger'),
		});

	const sendToGfMutation = makeStatusMutation(sendToGfApi, 'Sent to GF Office');
	const gfConfirmMutation = makeStatusMutation(markGfConfirmedApi, 'GF Confirmation Recorded');
	const slReconfirmMutation = makeStatusMutation(slReconfirmApi, 'SL Re-confirmation Done');
	const financeApproveMutation = makeStatusMutation(financeApproveApi, 'Finance Approved — PO Issued');
	const sendPoMutation = makeStatusMutation(sendPoToGfApi, 'PO Dispatched to GF');
	const finalizeMutation = makeStatusMutation(finalizePoApi, 'PO Finalized');
	const requestGoodsMutation = makeStatusMutation(requestGoodsApi, 'Goods Dispatch Requested');

	const uploadPiMutation = useMutation({
		mutationFn: ({ id, file }: { id: number; file: File }) => uploadPiApi(id, file),
		onSuccess: () => { invalidate(); showNotification(<><Icon icon='CheckCircle' className='me-2' />PI Uploaded</>, '', 'success'); },
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'PI upload failed'), 'danger'),
	});

	const uploadTtMutation = useMutation({
		mutationFn: ({ id, file }: { id: number; file: File }) => uploadTtApi(id, file),
		onSuccess: () => { invalidate(); showNotification(<><Icon icon='CheckCircle' className='me-2' />TT Uploaded</>, '', 'success'); },
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'TT upload failed'), 'danger'),
	});

	// A GOODS_REQUESTED inquiry (V60: used to be PO_FINALIZED — that step now
	// just means TT+PI payment is done, not that GF has been asked to ship)
	// can spawn more than one import shipment as its goods arrive — this only
	// opens the intake draft; Finance still has to fill in the packing list
	// and costing on the Import Shipments page.
	const createImportShipmentMutation = useMutation({
		mutationFn: createImportShipmentFromInquiryApi,
		onSuccess: (shipment) => {
			queryClient.invalidateQueries({ queryKey: ['importShipments'] });
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Import Shipment {shipment.shipmentNo} Created</>,
				'Find it under Import Process → Import Shipments to continue the intake.',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to create import shipment'), 'danger'),
	});

	const getRowActions = (row: PurchaseInquiryResponse) => {
		const actions: any[] = [
			{
				key: 'view',
				label: 'View Details',
				icon: 'ti ti-eye',
				className: 'text-info',
				onClick: () => { setSelectedInquiry(row); setIsDetailOpen(true); },
			},
		];

		if (canEdit && row.status === 'DRAFT_INQUIRY') {
			actions.push({
				key: 'edit',
				label: 'Edit',
				icon: 'ti ti-edit',
				onClick: () => { setEditTarget(row); setIsModalOpen(true); },
			});
		}
		if (canSendGf && row.status === 'DRAFT_INQUIRY') {
			actions.push({ key: 'sendGf', label: 'Send to GF Office', icon: 'ti ti-send', onClick: () => sendToGfMutation.mutate(row.id) });
		}
		if (canGfConfirm && row.status === 'PENDING_GF_CONFIRM') {
			actions.push({ key: 'gfConfirm', label: 'Record GF Confirmation', icon: 'ti ti-check', className: 'text-success', onClick: () => gfConfirmMutation.mutate(row.id) });
		}
		if (canSlReconfirm && row.status === 'GF_CONFIRMED') {
			actions.push({ key: 'slReconfirm', label: 'SL Re-confirm', icon: 'ti ti-check-all', className: 'text-primary', onClick: () => slReconfirmMutation.mutate(row.id) });
		}
		if (canFinanceApprove && row.status === 'SL_RECONFIRMED') {
			actions.push({ key: 'financeApprove', label: 'Finance Approve (Issue PO)', icon: 'ti ti-thumb-up', className: 'text-success', onClick: () => financeApproveMutation.mutate(row.id) });
		}
		if (canSendPo && row.status === 'PO_APPROVED') {
			actions.push({ key: 'sendPo', label: 'Send PO to GF', icon: 'ti ti-file-export', onClick: () => sendPoMutation.mutate(row.id) });
		}
		if (canUploadPi && row.status === 'AWAITING_PI') {
			actions.push({
				key: 'uploadPi',
				label: 'Upload Proforma Invoice',
				icon: 'ti ti-file-upload',
				onClick: () => {
					const input = document.createElement('input');
					input.type = 'file';
					input.accept = 'application/pdf,image/*';
					input.onchange = () => { if (input.files?.[0]) uploadPiMutation.mutate({ id: row.id, file: input.files[0] }); };
					input.click();
				},
			});
		}
		if (canUploadTt && row.status === 'PI_UPLOADED') {
			actions.push({
				key: 'uploadTt',
				label: 'Upload TT Receipt',
				icon: 'ti ti-file-upload',
				onClick: () => {
					const input = document.createElement('input');
					input.type = 'file';
					input.accept = 'application/pdf,image/*';
					input.onchange = () => { if (input.files?.[0]) uploadTtMutation.mutate({ id: row.id, file: input.files[0] }); };
					input.click();
				},
			});
		}
		if (canFinalize && row.status === 'PAYMENT_PROCESSED') {
			actions.push({ key: 'finalize', label: 'Finalize PO', icon: 'ti ti-check-circle', className: 'text-success', onClick: () => finalizeMutation.mutate(row.id) });
		}
		if (canRequestGoods && row.status === 'PO_FINALIZED') {
			actions.push({ key: 'requestGoods', label: 'Request Goods Dispatch', icon: 'ti ti-truck-delivery', className: 'text-primary', onClick: () => requestGoodsMutation.mutate(row.id) });
		}
		if (canCreateImportShipment && row.status === 'GOODS_REQUESTED' && !inquiriesWithShipment.has(row.id)) {
			actions.push({
				key: 'createImportShipment',
				label: 'Create Import Shipment',
				icon: 'ti ti-truck-delivery',
				className: 'text-primary',
				onClick: () => createImportShipmentMutation.mutate(row.id),
			});
		}

		return actions;
	};

	const columns: DataTableColumn<PurchaseInquiryResponse>[] = [
		{
			key: 'inquiryNo',
			label: 'Inquiry No',
			render: (row) => <span className='fw-bold text-primary'>{row.inquiryNo}</span>,
		},
		{
			key: 'title',
			label: 'Title',
			render: (row) => <span>{row.title || <span className='text-muted fst-italic'>No title</span>}</span>,
		},
		{
			key: 'createdByName',
			label: 'Created By',
		},
		{
			key: 'totalAmount',
			label: 'Total',
			align: 'right',
			render: (row) => <span className='fw-bold'>{formatCurrency(row.totalAmount)}</span>,
		},
		{
			key: 'status',
			label: 'Status',
			align: 'center',
			render: (row) => (
				<Badge color={INQUIRY_STATUS_COLORS[row.status] as any} isLight>
					{INQUIRY_STATUS_LABELS[row.status]}
				</Badge>
			),
		},
		{
			key: 'createdAt',
			label: 'Created',
			render: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span>,
		},
		{
			key: 'actions',
			label: '',
			align: 'right' as any,
			sortable: false,
			searchable: false,
			render: (row) => <DataTableActionMenu actions={getRowActions(row)} />,
		},
	];

	return (
		<PageWrapper title='Purchase Inquiries' requiredPermission={PERMISSIONS.SHOW_INQUIRY}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='FindInPage' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Purchase Inquiries</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								id='btn-new-inquiry'
								icon='Add'
								color='primary'
								isLight
								onClick={() => { setEditTarget(null); setIsModalOpen(true); }}>
								New Inquiry
							</Button>
						</>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={columns}
									data={inquiries}
									rowKey='id'
									loading={isLoading}
									error={error}
									fileName='purchase-inquiries'
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<CreateInquiryModal
				isOpen={isModalOpen}
				setIsOpen={(v) => { setIsModalOpen(v); if (!v) setEditTarget(null); }}
				editData={editTarget}
				isLoading={editTarget ? updateMutation.isPending : createMutation.isPending}
				onSubmit={(payload) => {
					if (editTarget) {
						updateMutation.mutate({ id: editTarget.id, payload });
					} else {
						createMutation.mutate(payload);
					}
				}}
			/>

			<InquiryDetailDrawer
				isOpen={isDetailOpen}
				setIsOpen={setIsDetailOpen}
				inquiry={selectedInquiry}
			/>
		</PageWrapper>
	);
};

export default PurchaseInquiriesPage;
