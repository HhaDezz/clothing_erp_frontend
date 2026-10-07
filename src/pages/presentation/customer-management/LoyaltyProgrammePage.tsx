import React, { useMemo, useState } from 'react';
import { useFormik } from 'formik';
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
import showNotification from '../../../components/extras/showNotification';
import { PERMISSIONS } from '../../../constants/permissions';
import { usePermission } from '../../../hooks/usePermission';
import useDarkMode from '../../../hooks/useDarkMode';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency } from '../../../helpers/currency';
import {
	LoyaltySettings,
	LoyaltySettingsPayload,
	LoyaltyTier,
	LoyaltyTierPayload,
	createLoyaltyTierApi,
	deleteLoyaltyTierApi,
	getLoyaltySettingsApi,
	getLoyaltyTiersApi,
	recalculateLoyaltyTiersApi,
	runLoyaltyExpiryApi,
	updateLoyaltySettingsApi,
	updateLoyaltyTierApi,
} from '../../../api/loyalty.api';
import LoyaltyTierModal from './LoyaltyTierModal';

type SettingsFormValues = {
	enabled: boolean;
	earnAmountPerPoint: number | '';
	pointValue: number | '';
	minBillToEarn: number | '';
	minPointsToRedeem: number | '';
	maxRedeemPctOfBill: number | '';
	earnOnRedeemedPortion: boolean;
	pointsExpiryMonths: number | '';
	minLineMarginPct: number | '';
	maxLoyaltyCostPctOfMargin: number | '';
	earnOnUnknownCost: boolean;
};

const num = (v: number | '') => (v === '' ? 0 : Number(v));

/**
 * What one line would earn under the settings currently on screen.
 *
 * This deliberately mirrors LoyaltyService#earnForLine on the backend, which
 * remains the authority — this exists so an admin can see what a rule like
 * "25% of margin" actually does to a real garment before saving it. If the
 * two ever drift, the backend is right.
 */
const previewLine = (values: SettingsFormValues, salePrice: number, cost: number | null) => {
	if (salePrice <= 0) {
		return { points: 0, reason: 'Enter a sale price to preview.' };
	}
	const raw = salePrice / Math.max(num(values.earnAmountPerPoint), 0.01);

	if (cost === null) {
		return values.earnOnUnknownCost
			? { points: Math.floor(raw), reason: 'No cost recorded — earning anyway, per the setting below.' }
			: { points: 0, reason: 'No cost recorded — blocked, per the setting below.' };
	}

	const margin = salePrice - cost;
	if (margin <= 0) {
		return { points: 0, reason: 'Sold at or below cost — no margin for points to come out of.' };
	}

	const marginPct = (margin / salePrice) * 100;
	if (marginPct < num(values.minLineMarginPct)) {
		return {
			points: 0,
			reason: `Margin is ${marginPct.toFixed(1)}%, below the ${num(values.minLineMarginPct)}% floor — earns nothing.`,
		};
	}

	const maxCost = (margin * num(values.maxLoyaltyCostPctOfMargin)) / 100;
	const maxPoints = maxCost / Math.max(num(values.pointValue), 0.01);

	if (raw > maxPoints) {
		return {
			points: Math.floor(maxPoints),
			reason: `Capped: ${Math.floor(raw)} points would cost more than ${num(values.maxLoyaltyCostPctOfMargin)}% of this line's ${formatCurrency(margin)} margin.`,
		};
	}
	return {
		points: Math.floor(raw),
		reason: `Margin is ${marginPct.toFixed(1)}% — comfortably above the floor, and the cap is not reached.`,
	};
};

const LoyaltyProgrammePage = () => {
	const { darkModeStatus } = useDarkMode();
	const queryClient = useQueryClient();
	const { hasPermission } = usePermission();
	const canEdit = hasPermission(PERMISSIONS.MANAGE_LOYALTY_SETTINGS);

	const [tierTarget, setTierTarget] = useState<LoyaltyTier | null>(null);
	const [isTierModalOpen, setIsTierModalOpen] = useState(false);

	// The preview's sample garment. Defaults to a round example so the page
	// says something useful the moment it opens.
	const [samplePrice, setSamplePrice] = useState<number | ''>(5000);
	const [sampleCost, setSampleCost] = useState<number | ''>(3500);

	const { data: settings, isLoading } = useQuery({
		queryKey: ['loyaltySettings'],
		queryFn: getLoyaltySettingsApi,
	});

	const { data: tiers = [], isLoading: tiersLoading } = useQuery({
		queryKey: ['loyaltyTiers'],
		queryFn: getLoyaltyTiersApi,
	});

	const formik = useFormik<SettingsFormValues>({
		enableReinitialize: true,
		initialValues: {
			enabled: settings?.enabled ?? false,
			earnAmountPerPoint: settings?.earnAmountPerPoint ?? 100,
			pointValue: settings?.pointValue ?? 1,
			minBillToEarn: settings?.minBillToEarn ?? 0,
			minPointsToRedeem: settings?.minPointsToRedeem ?? 100,
			maxRedeemPctOfBill: settings?.maxRedeemPctOfBill ?? 20,
			earnOnRedeemedPortion: settings?.earnOnRedeemedPortion ?? false,
			pointsExpiryMonths: settings?.pointsExpiryMonths ?? '',
			minLineMarginPct: settings?.minLineMarginPct ?? 0,
			maxLoyaltyCostPctOfMargin: settings?.maxLoyaltyCostPctOfMargin ?? 100,
			earnOnUnknownCost: settings?.earnOnUnknownCost ?? true,
		},
		onSubmit: (values) => {
			const payload: LoyaltySettingsPayload = {
				enabled: values.enabled,
				earnAmountPerPoint: num(values.earnAmountPerPoint),
				pointValue: num(values.pointValue),
				minBillToEarn: num(values.minBillToEarn),
				minPointsToRedeem: num(values.minPointsToRedeem),
				maxRedeemPctOfBill: num(values.maxRedeemPctOfBill),
				earnOnRedeemedPortion: values.earnOnRedeemedPortion,
				// An empty box means "never expire", which the API takes as null.
				pointsExpiryMonths: values.pointsExpiryMonths === '' ? null : Number(values.pointsExpiryMonths),
				minLineMarginPct: num(values.minLineMarginPct),
				maxLoyaltyCostPctOfMargin: num(values.maxLoyaltyCostPctOfMargin),
				earnOnUnknownCost: values.earnOnUnknownCost,
			};
			saveMutation.mutate(payload);
		},
	});

	const saveMutation = useMutation({
		mutationFn: updateLoyaltySettingsApi,
		onSuccess: (saved: LoyaltySettings) => {
			queryClient.setQueryData(['loyaltySettings'], saved);
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Loyalty Settings Saved</>,
				saved.enabled ? 'The scheme is live.' : 'The scheme is saved but switched off.',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to save settings'), 'danger'),
	});

	const tierMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number | null; payload: LoyaltyTierPayload }) =>
			id === null ? createLoyaltyTierApi(payload) : updateLoyaltyTierApi(id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] });
			setIsTierModalOpen(false);
			setTierTarget(null);
			showNotification(<><Icon icon='CheckCircle' className='me-2' />Tier Saved</>, '', 'success');
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to save tier'), 'danger'),
	});

	const deleteTierMutation = useMutation({
		mutationFn: deleteLoyaltyTierApi,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] });
			showNotification(
				<><Icon icon='CheckCircle' className='me-2' />Tier Deleted</>,
				'Customers in that tier now earn at the base rate until tiers are recalculated.',
				'success',
			);
		},
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Failed to delete tier'), 'danger'),
	});

	const expiryMutation = useMutation({
		mutationFn: runLoyaltyExpiryApi,
		onSuccess: (res) => showNotification('Expiry run', res.message, 'success'),
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Expiry run failed'), 'danger'),
	});

	const recalcMutation = useMutation({
		mutationFn: recalculateLoyaltyTiersApi,
		onSuccess: (res) => showNotification('Tiers recalculated', res.message, 'success'),
		onError: (e) => showNotification('Error', getApiErrorMessage(e, 'Recalculation failed'), 'danger'),
	});

	const preview = useMemo(
		() => previewLine(formik.values, num(samplePrice), sampleCost === '' ? null : Number(sampleCost)),
		[formik.values, samplePrice, sampleCost],
	);

	const pointsValue = preview.points * num(formik.values.pointValue);

	return (
		<PageWrapper title='Loyalty Programme' requiredPermission={PERMISSIONS.SHOW_CUSTOMER_INSIGHTS}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='CardGiftcard' size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>Loyalty Programme</span>
					{settings && (
						<Badge color={settings.enabled ? 'success' : 'secondary'} isLight className='ms-3'>
							{settings.enabled ? 'Live' : 'Switched off'}
						</Badge>
					)}
				</SubHeaderLeft>
				{canEdit && (
					<SubHeaderRight>
						<Button
							color='light'
							icon='Schedule'
							isDisable={expiryMutation.isPending}
							onClick={() => expiryMutation.mutate()}>
							Run Expiry
						</Button>
						<Button
							color='light'
							icon='Refresh'
							isDisable={recalcMutation.isPending}
							onClick={() => recalcMutation.mutate()}>
							Recalculate Tiers
						</Button>
						<Button
							color='primary'
							icon='Save'
							isDisable={saveMutation.isPending}
							onClick={() => formik.handleSubmit()}>
							{saveMutation.isPending ? 'Saving...' : 'Save Settings'}
						</Button>
					</SubHeaderRight>
				)}
			</SubHeader>

			<Page>
				{isLoading ? (
					<div className='text-center py-5'>
						<Spinner color='primary' />
					</div>
				) : (
					<div className='row g-4'>
						{/* Master switch */}
						<div className='col-12'>
							<Card>
								<CardBody>
									<div className='d-flex align-items-start gap-3'>
										<input
											id='enabled'
											name='enabled'
											type='checkbox'
											className='form-check-input mt-1'
											checked={formik.values.enabled}
											onChange={formik.handleChange}
											disabled={!canEdit}
										/>
										<div>
											<label htmlFor='enabled' className='fw-bold fs-5 mb-1 d-block'>
												Loyalty scheme is running
											</label>
											<div className='text-muted'>
												While this is off, no points are earned and none can be
												spent. Everything below stays saved, so the scheme can be
												set up in full and switched on when you are ready.
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>

						{/* Earning */}
						<div className='col-lg-6'>
							<Card stretch>
								<CardBody>
									<h5 className='fw-bold mb-3'>Earning</h5>
									<div className='row g-3'>
										<FormGroup
											id='earnAmountPerPoint'
											label='Spend per point'
											className='col-md-6'>
											<Input
												name='earnAmountPerPoint'
												type='number'
												min={0.01}
												step={0.01}
												value={formik.values.earnAmountPerPoint}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												Spend this much to earn one point.
											</div>
										</FormGroup>
										<FormGroup id='pointValue' label='Point value' className='col-md-6'>
											<Input
												name='pointValue'
												type='number'
												min={0.01}
												step={0.01}
												value={formik.values.pointValue}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												What one point is worth when spent.
											</div>
										</FormGroup>
										<FormGroup
											id='minBillToEarn'
											label='Minimum bill to earn'
											className='col-md-6'>
											<Input
												name='minBillToEarn'
												type='number'
												min={0}
												step={0.01}
												value={formik.values.minBillToEarn}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												Zero means every bill earns.
											</div>
										</FormGroup>
										<FormGroup
											id='pointsExpiryMonths'
											label='Points expire after (months)'
											className='col-md-6'>
											<Input
												name='pointsExpiryMonths'
												type='number'
												min={1}
												placeholder='Leave blank: never expire'
												value={formik.values.pointsExpiryMonths}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												Oldest points are always spent first.
											</div>
										</FormGroup>
									</div>
								</CardBody>
							</Card>
						</div>

						{/* Redeeming */}
						<div className='col-lg-6'>
							<Card stretch>
								<CardBody>
									<h5 className='fw-bold mb-3'>Redeeming</h5>
									<div className='row g-3'>
										<FormGroup
											id='minPointsToRedeem'
											label='Minimum balance to spend'
											className='col-md-6'>
											<Input
												name='minPointsToRedeem'
												type='number'
												min={0}
												value={formik.values.minPointsToRedeem}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												Points below this cannot be spent at all.
											</div>
										</FormGroup>
										<FormGroup
											id='maxRedeemPctOfBill'
											label='Max share of a bill (%)'
											className='col-md-6'>
											<Input
												name='maxRedeemPctOfBill'
												type='number'
												min={0}
												max={100}
												step={0.01}
												value={formik.values.maxRedeemPctOfBill}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												Points can never pay more than this of any one bill.
											</div>
										</FormGroup>
										<div className='col-12'>
											<div className='form-check'>
												<input
													id='earnOnRedeemedPortion'
													name='earnOnRedeemedPortion'
													type='checkbox'
													className='form-check-input'
													checked={formik.values.earnOnRedeemedPortion}
													onChange={formik.handleChange}
													disabled={!canEdit}
												/>
												<label
													className='form-check-label'
													htmlFor='earnOnRedeemedPortion'>
													Earn points on the part of a bill paid with points
												</label>
											</div>
											<div className='text-muted small mt-1'>
												Usually left off — leaving it on lets the scheme compound
												on itself.
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>

						{/* The margin guards */}
						<div className='col-lg-7'>
							<Card stretch>
								<CardBody>
									<h5 className='fw-bold mb-1'>Margin guards</h5>
									<p className='text-muted'>
										Points are a cost of sale, so they are bounded per line against
										what that line actually made. Both rules are checked against the
										landed cost recorded on each sale line.
									</p>
									<div className='row g-3'>
										<FormGroup
											id='minLineMarginPct'
											label='Minimum line margin to earn (%)'
											className='col-md-6'>
											<Input
												name='minLineMarginPct'
												type='number'
												min={0}
												max={100}
												step={0.01}
												value={formik.values.minLineMarginPct}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												A line thinner than this earns nothing — clearance stock
												sold near cost.
											</div>
										</FormGroup>
										<FormGroup
											id='maxLoyaltyCostPctOfMargin'
											label='Max loyalty cost, as share of margin (%)'
											className='col-md-6'>
											<Input
												name='maxLoyaltyCostPctOfMargin'
												type='number'
												min={0}
												max={100}
												step={0.01}
												value={formik.values.maxLoyaltyCostPctOfMargin}
												onChange={formik.handleChange}
												disabled={!canEdit}
											/>
											<div className='text-muted small mt-1'>
												Points awarded on a line can never be worth more than this
												share of its margin.
											</div>
										</FormGroup>
										<div className='col-12'>
											<div className='form-check'>
												<input
													id='earnOnUnknownCost'
													name='earnOnUnknownCost'
													type='checkbox'
													className='form-check-input'
													checked={formik.values.earnOnUnknownCost}
													onChange={formik.handleChange}
													disabled={!canEdit}
												/>
												<label className='form-check-label' htmlFor='earnOnUnknownCost'>
													Still earn on lines with no recorded cost
												</label>
											</div>
											<div className='text-muted small mt-1'>
												On by default: a customer should not lose points because of
												a gap in our own cost data. Turn it off once cost coverage
												is good and the guards should be absolute.
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>

						{/* Live preview */}
						<div className='col-lg-5'>
							<Card stretch>
								<CardBody>
									<h5 className='fw-bold mb-1'>Preview one garment</h5>
									<p className='text-muted'>
										What a single line would earn under the settings on this page,
										before saving.
									</p>
									<div className='row g-3 mb-3'>
										<FormGroup id='samplePrice' label='Sale price' className='col-6'>
											<Input
												name='samplePrice'
												type='number'
												min={0}
												step={0.01}
												value={samplePrice}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setSamplePrice(
														e.target.value === '' ? '' : Number(e.target.value),
													)
												}
											/>
										</FormGroup>
										<FormGroup id='sampleCost' label='Landed cost' className='col-6'>
											<Input
												name='sampleCost'
												type='number'
												min={0}
												step={0.01}
												placeholder='Blank = no cost recorded'
												value={sampleCost}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setSampleCost(
														e.target.value === '' ? '' : Number(e.target.value),
													)
												}
											/>
										</FormGroup>
									</div>
									<div
										// bg-l10-* is a pale tint meant for a light page; in dark mode
										// it stays pale and the light text on it disappears, so use
										// the translucent (bg-lo25-*) variant there instead.
										className={`rounded-3 p-3 bg-l${darkModeStatus ? 'o25' : '10'}-${
											preview.points > 0 ? 'success' : 'warning'
										}`}>
										<div className='d-flex align-items-baseline gap-2'>
											<span className='fs-2 fw-bold'>{preview.points}</span>
											<span className='fw-bold'>
												point{preview.points === 1 ? '' : 's'}
											</span>
											<span className='text-muted ms-auto'>
												costs {formatCurrency(pointsValue)}
											</span>
										</div>
										<div className='small mt-2'>{preview.reason}</div>
									</div>
									<div className='text-muted small mt-2'>
										Tier multipliers are not applied here — this is the base rate.
									</div>
								</CardBody>
							</Card>
						</div>

						{/* Tiers */}
						<div className='col-12'>
							<Card>
								<CardBody>
									<div className='d-flex align-items-center justify-content-between mb-3'>
										<div>
											<h5 className='fw-bold mb-1'>Tiers</h5>
											<div className='text-muted small'>
												Matched on rolling 12-month spend; the highest a customer
												qualifies for wins. With no tiers, everyone earns at the
												base rate.
											</div>
										</div>
										{canEdit && (
											<Button
												color='primary'
												isLight
												icon='Add'
												onClick={() => {
													setTierTarget(null);
													setIsTierModalOpen(true);
												}}>
												New Tier
											</Button>
										)}
									</div>

									{tiersLoading ? (
										<div className='text-center py-4'>
											<Spinner isSmall />
										</div>
									) : tiers.length === 0 ? (
										<div className='text-muted fst-italic'>
											No tiers configured — every customer earns at the base rate.
										</div>
									) : (
										<div className='table-responsive'>
											<table className='table table-sm table-hover align-middle mb-0'>
												<thead className='table-light'>
													<tr>
														<th>Tier</th>
														<th className='text-end'>Min 12-month spend</th>
														<th className='text-center'>Multiplier</th>
														<th className='text-center'>Birthday bonus</th>
														{canEdit && <th className='text-end'>&nbsp;</th>}
													</tr>
												</thead>
												<tbody>
													{tiers.map((tier) => (
														<tr key={tier.id}>
															<td>
																<Badge
																	color={(tier.color as any) || 'info'}
																	isLight>
																	{tier.name}
																</Badge>
															</td>
															<td className='text-end'>
																{formatCurrency(tier.minSpend12m)}
															</td>
															<td className='text-center fw-bold'>
																×{tier.earnMultiplier}
															</td>
															<td className='text-center'>
																{tier.birthdayBonusPoints || '—'}
															</td>
															{canEdit && (
																<td className='text-end'>
																	<Button
																		size='sm'
																		color='light'
																		icon='Edit'
																		onClick={() => {
																			setTierTarget(tier);
																			setIsTierModalOpen(true);
																		}}
																	/>
																	<Button
																		size='sm'
																		color='light'
																		icon='Delete'
																		className='text-danger ms-1'
																		isDisable={deleteTierMutation.isPending}
																		onClick={() =>
																			deleteTierMutation.mutate(tier.id)
																		}
																	/>
																</td>
															)}
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</CardBody>
							</Card>
						</div>

						{settings?.updatedByName && (
							<div className='col-12 text-muted small'>
								Last changed by {settings.updatedByName}
								{settings.updatedAt
									? ` on ${new Date(settings.updatedAt).toLocaleString()}`
									: ''}
								.
							</div>
						)}
					</div>
				)}
			</Page>

			<LoyaltyTierModal
				tier={tierTarget}
				isOpen={isTierModalOpen}
				setIsOpen={setIsTierModalOpen}
				isSaving={tierMutation.isPending}
				onSubmit={(payload) =>
					tierMutation.mutate({ id: tierTarget?.id ?? null, payload })
				}
			/>
		</PageWrapper>
	);
};

export default LoyaltyProgrammePage;
