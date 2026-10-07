import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/bootstrap/Badge';
import Spinner from '../../../components/bootstrap/Spinner';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import showNotification from '../../../components/extras/showNotification';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';
import { PERMISSIONS } from '../../../constants/permissions';
import { getLoyaltyTiersApi, LoyaltyTier } from '../../../api/loyalty.api';
import {
	Segment,
	SegmentPayload,
	SegmentPreview,
	SegmentRules,
	SegmentType,
	createSegmentApi,
	deleteSegmentApi,
	emptySegmentRules,
	getSegmentsApi,
	previewSegmentRulesApi,
	updateSegmentApi,
} from '../../../api/segments.api';

const GENDERS: { value: string; label: string }[] = [
	{ value: 'MALE', label: 'Male' },
	{ value: 'FEMALE', label: 'Female' },
	{ value: 'OTHER', label: 'Other' },
];

const MONTHS = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Optional-number input — an empty box means "no bound on this side", not
// zero, matching how SegmentRules is read on the backend (a null bound is
// simply not applied).
const numOrUndef = (raw: string): number | undefined => (raw === '' ? undefined : Number(raw));
const asInputValue = (v: number | null | undefined): number | '' => (v === null || v === undefined ? '' : v);

// Comma-separated free text <-> string[] | undefined. Cities and product
// categories aren't a fixed list anywhere in this codebase (no master-data
// page for either), so a typed, comma-separated box is the only input that
// doesn't require inventing one.
const parseList = (raw: string): string[] | undefined => {
	const items = raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return items.length ? items : undefined;
};

type TriState = '' | 'true' | 'false';
const triToBool = (v: TriState): boolean | undefined => (v === '' ? undefined : v === 'true');
const boolToTri = (v: boolean | null | undefined): TriState => (v === null || v === undefined ? '' : v ? 'true' : 'false');

/**
 * Who a rule set actually selects, refreshed 400ms after the rules stop
 * changing — mirrors the debounce pattern CheckoutModal uses for the loyalty
 * quote (see quoteLoyaltyApi there): the backend evaluation is the source of
 * truth, this just avoids firing it on every keystroke.
 */
const useRulePreview = (rules: SegmentRules, enabled: boolean) => {
	const [debounced, setDebounced] = useState(rules);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(rules), 400);
		return () => clearTimeout(timer);
	}, [rules]);

	return useQuery({
		queryKey: ['segmentRulesPreview', debounced],
		queryFn: () => previewSegmentRulesApi(debounced),
		enabled,
	});
};

const SegmentBuilderModal: React.FC<{
	segment: Segment | null;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
}> = ({ segment, isOpen, setIsOpen }) => {
	const queryClient = useQueryClient();
	const isEditing = segment !== null;

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [type, setType] = useState<SegmentType>('RULE');
	const [rules, setRules] = useState<SegmentRules>(emptySegmentRules());
	const [citiesInput, setCitiesInput] = useState('');
	const [categoriesInput, setCategoriesInput] = useState('');
	const [memberIdsInput, setMemberIdsInput] = useState('');

	const { data: tiers = [] } = useQuery({
		queryKey: ['loyaltyTiers'],
		queryFn: getLoyaltyTiersApi,
		enabled: isOpen,
	});

	// Reseed the form from the segment being edited (or a blank one) every
	// time the modal opens — not on every render, so typing isn't fought.
	useEffect(() => {
		if (!isOpen) return;
		setName(segment?.name ?? '');
		setDescription(segment?.description ?? '');
		setType(segment?.type ?? 'RULE');
		const r = segment?.rules ?? emptySegmentRules();
		setRules(r);
		setCitiesInput((r.cities ?? []).join(', '));
		setCategoriesInput((r.boughtCategories ?? []).join(', '));
		setMemberIdsInput('');
	}, [isOpen, segment]);

	const setRule = <K extends keyof SegmentRules>(key: K, value: SegmentRules[K]) =>
		setRules((current) => ({ ...current, [key]: value }));

	const toggleInArray = <T,>(list: T[] | null | undefined, value: T): T[] => {
		const current = list ?? [];
		return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
	};

	const preview = useRulePreview(rules, isOpen && type === 'RULE');

	const saveMutation = useMutation({
		mutationFn: (payload: SegmentPayload) =>
			isEditing ? updateSegmentApi(segment!.id, payload) : createSegmentApi(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['segments'] });
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Segment Saved</>,
				'',
				'success',
			);
			setIsOpen(false);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to save segment'), 'danger'),
	});

	const handleSave = () => {
		if (!name.trim()) {
			showNotification('Name required', 'Give this segment a name first.', 'warning');
			return;
		}
		const payload: SegmentPayload = {
			name: name.trim(),
			description: description.trim() || undefined,
			type,
		};
		if (type === 'RULE') {
			payload.rules = rules;
		} else {
			const memberIds = memberIdsInput
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
				.map(Number)
				.filter((n) => !Number.isNaN(n));
			payload.memberIds = memberIds;
		}
		saveMutation.mutate(payload);
	};

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' titleId='segment-builder-modal' isCentered>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='segment-builder-modal'>
					{isEditing ? `Edit Segment — ${segment?.name}` : 'New Segment'}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='row g-4'>
					<div className='col-lg-7'>
						<div className='row g-3 mb-3'>
							<FormGroup id='segmentName' label='Name' className='col-md-7'>
								<Input
									name='segmentName'
									value={name}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
									placeholder='e.g. Lapsed Gold customers'
								/>
							</FormGroup>
							<FormGroup id='segmentType' label='Type' className='col-md-5'>
								<select
									id='segmentType'
									className='form-select'
									value={type}
									onChange={(e) => setType(e.target.value as SegmentType)}
									disabled={isEditing}>
									<option value='RULE'>Rule-based (auto-updates)</option>
									<option value='MANUAL'>Manual list</option>
								</select>
							</FormGroup>
							<FormGroup id='segmentDescription' label='Description' className='col-12'>
								<Input
									name='segmentDescription'
									value={description}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
									placeholder='Optional — what this segment is for'
								/>
							</FormGroup>
						</div>

						{type === 'MANUAL' ? (
							<Card>
								<CardBody>
									<h6 className='fw-bold mb-2'>Members</h6>
									<p className='text-muted small'>
										Comma-separated customer IDs. There's no picker here yet — look
										up IDs on the Customers page.
									</p>
									<textarea
										className='form-control'
										rows={4}
										value={memberIdsInput}
										onChange={(e) => setMemberIdsInput(e.target.value)}
										placeholder='e.g. 101, 102, 145'
									/>
								</CardBody>
							</Card>
						) : (
							<div className='d-flex flex-column gap-3'>
								<Card>
									<CardBody>
										<h6 className='fw-bold mb-3'>How much they spend</h6>
										<div className='row g-3'>
											<FormGroup id='minTotalSpend' label='Min lifetime spend' className='col-6'>
												<Input
													type='number' min={0} name='minTotalSpend'
													value={asInputValue(rules.minTotalSpend)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('minTotalSpend', numOrUndef(e.target.value))}
												/>
											</FormGroup>
											<FormGroup id='maxTotalSpend' label='Max lifetime spend' className='col-6'>
												<Input
													type='number' min={0} name='maxTotalSpend'
													value={asInputValue(rules.maxTotalSpend)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('maxTotalSpend', numOrUndef(e.target.value))}
												/>
											</FormGroup>
											<FormGroup id='minVisitCount' label='Min visit count' className='col-6'>
												<Input
													type='number' min={0} name='minVisitCount'
													value={asInputValue(rules.minVisitCount)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('minVisitCount', numOrUndef(e.target.value))}
												/>
											</FormGroup>
											<FormGroup id='maxVisitCount' label='Max visit count' className='col-6'>
												<Input
													type='number' min={0} name='maxVisitCount'
													value={asInputValue(rules.maxVisitCount)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('maxVisitCount', numOrUndef(e.target.value))}
												/>
											</FormGroup>
											<FormGroup
												id='lastVisitWithinDays'
												label='Seen within (days)'
												className='col-6'>
												<Input
													type='number' min={1} name='lastVisitWithinDays'
													value={asInputValue(rules.lastVisitWithinDays)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('lastVisitWithinDays', numOrUndef(e.target.value))}
												/>
												<div className='text-muted small mt-1'>The active ones.</div>
											</FormGroup>
											<FormGroup
												id='lastVisitBeforeDays'
												label='NOT seen for at least (days)'
												className='col-6'>
												<Input
													type='number' min={1} name='lastVisitBeforeDays'
													value={asInputValue(rules.lastVisitBeforeDays)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('lastVisitBeforeDays', numOrUndef(e.target.value))}
												/>
												<div className='text-muted small mt-1'>The lapsed ones.</div>
											</FormGroup>
										</div>
									</CardBody>
								</Card>

								<Card>
									<CardBody>
										<h6 className='fw-bold mb-3'>What they buy</h6>
										<div className='row g-3'>
											<FormGroup
												id='boughtCategories'
												label='Product categories bought'
												className='col-12'>
												<Input
													name='boughtCategories'
													value={categoriesInput}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
														setCategoriesInput(e.target.value);
														setRule('boughtCategories', parseList(e.target.value));
													}}
													placeholder='e.g. Sarees, Kids Wear'
												/>
											</FormGroup>
											<FormGroup
												id='boughtWithinDays'
												label='Purchase within last (days)'
												className='col-6'>
												<Input
													type='number' min={1} name='boughtWithinDays'
													value={asInputValue(rules.boughtWithinDays)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('boughtWithinDays', numOrUndef(e.target.value))}
												/>
											</FormGroup>
										</div>
									</CardBody>
								</Card>

								<Card>
									<CardBody>
										<h6 className='fw-bold mb-3'>Who they are</h6>
										{tiers.length > 0 && (
											<div className='mb-3'>
												<div className='fw-bold small mb-1'>Loyalty tier</div>
												<div className='d-flex flex-wrap gap-3'>
													{tiers.map((tier: LoyaltyTier) => (
														<div className='form-check' key={tier.id}>
															<input
																id={`tier-${tier.id}`}
																type='checkbox'
																className='form-check-input'
																checked={(rules.loyaltyTierIds ?? []).includes(tier.id)}
																onChange={() => {
																	const next = toggleInArray(rules.loyaltyTierIds, tier.id);
																	setRule('loyaltyTierIds', next.length ? next : undefined);
																}}
															/>
															<label className='form-check-label' htmlFor={`tier-${tier.id}`}>
																{tier.name}
															</label>
														</div>
													))}
												</div>
											</div>
										)}
										<div className='mb-3'>
											<div className='fw-bold small mb-1'>Gender</div>
											<div className='d-flex flex-wrap gap-3'>
												{GENDERS.map((g) => (
													<div className='form-check' key={g.value}>
														<input
															id={`gender-${g.value}`}
															type='checkbox'
															className='form-check-input'
															checked={(rules.genders ?? []).includes(g.value)}
															onChange={() => {
																const next = toggleInArray(rules.genders, g.value);
																setRule('genders', next.length ? next : undefined);
															}}
														/>
														<label className='form-check-label' htmlFor={`gender-${g.value}`}>
															{g.label}
														</label>
													</div>
												))}
											</div>
										</div>
										<div className='mb-3'>
											<div className='fw-bold small mb-1'>Birthday month</div>
											<div className='d-flex flex-wrap gap-2'>
												{MONTHS.map((label, idx) => {
													const month = idx + 1;
													const active = (rules.birthdayMonths ?? []).includes(month);
													return (
														<button
															key={month}
															type='button'
															className={`btn btn-sm ${active ? 'btn-primary' : 'btn-light'}`}
															onClick={() => {
																const next = toggleInArray(rules.birthdayMonths, month);
																setRule('birthdayMonths', next.length ? next : undefined);
															}}>
															{label}
														</button>
													);
												})}
											</div>
										</div>
										<FormGroup id='cities' label='City' className='col-12'>
											<Input
												name='cities'
												value={citiesInput}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
													setCitiesInput(e.target.value);
													setRule('cities', parseList(e.target.value));
												}}
												placeholder='e.g. Colombo, Kandy'
											/>
										</FormGroup>
									</CardBody>
								</Card>

								<Card>
									<CardBody>
										<h6 className='fw-bold mb-3'>What they hold</h6>
										<div className='row g-3'>
											<FormGroup
												id='minPointsBalance'
												label='Min loyalty points balance'
												className='col-md-4'>
												<Input
													type='number' min={0} name='minPointsBalance'
													value={asInputValue(rules.minPointsBalance)}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRule('minPointsBalance', numOrUndef(e.target.value))}
												/>
											</FormGroup>
											<FormGroup id='hasStoreCredit' label='Has store credit' className='col-md-4'>
												<select
													id='hasStoreCredit'
													className='form-select'
													value={boolToTri(rules.hasStoreCredit)}
													onChange={(e) =>
														setRule('hasStoreCredit', triToBool(e.target.value as TriState))
													}>
													<option value=''>Any</option>
													<option value='true'>Yes</option>
													<option value='false'>No</option>
												</select>
											</FormGroup>
											<FormGroup id='owesOnAccount' label='Owes on account' className='col-md-4'>
												<select
													id='owesOnAccount'
													className='form-select'
													value={boolToTri(rules.owesOnAccount)}
													onChange={(e) =>
														setRule('owesOnAccount', triToBool(e.target.value as TriState))
													}>
													<option value=''>Any</option>
													<option value='true'>Yes</option>
													<option value='false'>No</option>
												</select>
											</FormGroup>
										</div>
									</CardBody>
								</Card>

								<Card>
									<CardBody>
										<h6 className='fw-bold mb-2'>Reachability</h6>
										<p className='text-muted small'>
											Whether they have an address on file — not whether they've
											opted in. Consent is checked again when a campaign actually
											sends.
										</p>
										<div className='d-flex gap-4'>
											<div className='form-check'>
												<input
													id='requireEmail'
													type='checkbox'
													className='form-check-input'
													checked={rules.requireEmail === true}
													onChange={(e) => setRule('requireEmail', e.target.checked || undefined)}
												/>
												<label className='form-check-label' htmlFor='requireEmail'>
													Must have an email
												</label>
											</div>
											<div className='form-check'>
												<input
													id='requirePhone'
													type='checkbox'
													className='form-check-input'
													checked={rules.requirePhone === true}
													onChange={(e) => setRule('requirePhone', e.target.checked || undefined)}
												/>
												<label className='form-check-label' htmlFor='requirePhone'>
													Must have a phone
												</label>
											</div>
										</div>
									</CardBody>
								</Card>
							</div>
						)}
					</div>

					<div className='col-lg-5'>
						<Card stretch className='sticky-top' style={{ top: 16 }}>
							<CardBody>
								<h6 className='fw-bold mb-1'>Live preview</h6>
								{type === 'MANUAL' ? (
									<p className='text-muted small'>
										A manual list isn't evaluated live — save it to see who's in it.
									</p>
								) : preview.isFetching && !preview.data ? (
									<div className='text-center py-4'>
										<Spinner isSmall />
									</div>
								) : preview.data ? (
									<SegmentPreviewSummary preview={preview.data} isRefreshing={preview.isFetching} />
								) : (
									<p className='text-muted small'>Set a rule to see who matches.</p>
								)}
							</CardBody>
						</Card>
					</div>
				</div>
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button color='primary' isDisable={saveMutation.isPending} onClick={handleSave}>
					{saveMutation.isPending ? 'Saving...' : isEditing ? 'Save Segment' : 'Create Segment'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

const SegmentPreviewSummary: React.FC<{ preview: SegmentPreview; isRefreshing: boolean }> = ({
	preview,
	isRefreshing,
}) => (
	<div style={{ opacity: isRefreshing ? 0.6 : 1 }}>
		<div className='d-flex align-items-baseline gap-2 mb-3'>
			<span className='fs-2 fw-bold'>{preview.totalMatched}</span>
			<span className='fw-bold'>customer{preview.totalMatched === 1 ? '' : 's'}</span>
		</div>
		<div className='row g-2 mb-3'>
			<div className='col-6'>
				<div className='rounded-3 bg-l10-info p-2 text-center'>
					<div className='fw-bold'>{preview.reachableByEmail}</div>
					<div className='small text-muted'>reachable by email</div>
				</div>
			</div>
			<div className='col-6'>
				<div className='rounded-3 bg-l10-info p-2 text-center'>
					<div className='fw-bold'>{preview.reachableBySms}</div>
					<div className='small text-muted'>reachable by SMS</div>
				</div>
			</div>
		</div>
		<div className='text-muted small mb-3'>
			Combined lifetime spend: {formatCurrency(preview.totalSpendOfSegment)}
		</div>
		{preview.sample.length > 0 && (
			<>
				<div className='fw-bold small mb-1'>Sample</div>
				<div className='table-responsive'>
					<table className='table table-sm mb-0'>
						<tbody>
							{preview.sample.map((c) => (
								<tr key={c.id}>
									<td>{c.name}</td>
									<td className='text-muted small'>{c.tierName ?? '—'}</td>
									<td className='text-end small'>{formatCurrency(c.totalSpend ?? 0)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</>
		)}
	</div>
);

const SegmentBuilderPage = () => {
	const queryClient = useQueryClient();
	const [builderTarget, setBuilderTarget] = useState<Segment | null>(null);
	const [isBuilderOpen, setIsBuilderOpen] = useState(false);

	const { data: segments = [], isLoading } = useQuery({
		queryKey: ['segments'],
		queryFn: getSegmentsApi,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteSegmentApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['segments'] });
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Segment Deleted</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to delete segment'), 'danger'),
	});

	return (
		<PageWrapper title='Customer Segments' requiredPermission={PERMISSIONS.MANAGE_CUSTOMER_SEGMENTS}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Groups' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Customer Segments</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setBuilderTarget(null);
							setIsBuilderOpen(true);
						}}>
						New Segment
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page>
				<Card>
					<CardBody>
						{isLoading ? (
							<div className='text-center py-5'>
								<Spinner color='primary' />
							</div>
						) : segments.length === 0 ? (
							<div className='text-muted fst-italic text-center py-4'>
								No segments yet. Build one to target a campaign at it.
							</div>
						) : (
							<div className='table-responsive'>
								<table className='table table-hover align-middle mb-0'>
									<thead className='table-light'>
										<tr>
											<th>Name</th>
											<th>Type</th>
											<th>Created by</th>
											<th className='text-end'>&nbsp;</th>
										</tr>
									</thead>
									<tbody>
										{segments.map((segment) => (
											<tr key={segment.id}>
												<td>
													<div className='fw-bold'>{segment.name}</div>
													{segment.description && (
														<div className='text-muted small'>{segment.description}</div>
													)}
												</td>
												<td>
													<Badge color={segment.type === 'RULE' ? 'info' : 'secondary'} isLight>
														{segment.type === 'RULE' ? 'Rule-based' : 'Manual'}
													</Badge>
												</td>
												<td className='text-muted small'>{segment.createdByName ?? '—'}</td>
												<td className='text-end'>
													<Button
														size='sm'
														color='light'
														icon='Edit'
														onClick={() => {
															setBuilderTarget(segment);
															setIsBuilderOpen(true);
														}}
													/>
													<Button
														size='sm'
														color='light'
														icon='Delete'
														className='text-danger ms-1'
														isDisable={deleteMutation.isPending}
														onClick={() => {
															if (window.confirm(`Delete segment "${segment.name}"? Any campaign built on it keeps its own recipient list.`)) {
																deleteMutation.mutate(segment.id);
															}
														}}
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardBody>
				</Card>
			</Page>

			<SegmentBuilderModal
				segment={builderTarget}
				isOpen={isBuilderOpen}
				setIsOpen={setIsBuilderOpen}
			/>
		</PageWrapper>
	);
};

export default SegmentBuilderPage;
