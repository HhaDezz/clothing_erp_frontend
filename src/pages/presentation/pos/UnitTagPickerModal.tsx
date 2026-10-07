import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import Button from '../../../components/bootstrap/Button';
import Input from '../../../components/bootstrap/forms/Input';
import Alert from '../../../components/bootstrap/Alert';
import Icon from '../../../components/icon/Icon';
import { getSellableUnitTagsApi, PosUnitTag, PosVariantResponse } from '../../../api/pos.api';
import { formatCurrency } from '../../../helpers/currency';

interface Props {
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	variant: PosVariantResponse | null;
	showroomId: number | null | undefined;
	/** Tags already in the cart — shown but not selectable. */
	inCartUnitIds: number[];
	onAdd: (variant: PosVariantResponse, tags: PosUnitTag[]) => void;
}

/**
 * Manual "Add" on a POS product card (no scan) — "need to select or search
 * which bar code going to sold out". Lists every barcode tag for this item
 * that is physically at the shift's showroom and still unsold; the cashier
 * ticks the exact garment(s) being sold. Each ticked tag becomes its own cart
 * line and is flagged SOLD at checkout, same as if it had been scanned.
 * Picking a tag is mandatory: an item with no sellable tags here can't be
 * added by hand.
 */
const UnitTagPickerModal: React.FC<Props> = ({
	isOpen,
	setIsOpen,
	variant,
	showroomId,
	inCartUnitIds,
	onAdd,
}) => {
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<Set<number>>(new Set());

	const {
		data: tags = [],
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['sellableUnitTags', variant?.id, showroomId],
		queryFn: () => getSellableUnitTagsApi(variant!.id, showroomId as number),
		enabled: isOpen && Boolean(variant) && Boolean(showroomId),
		// Always fresh — another till may have just sold one of these.
		staleTime: 0,
		refetchOnMount: 'always',
	});

	useEffect(() => {
		if (!isOpen) {
			setSearch('');
			setSelected(new Set());
		}
	}, [isOpen]);

	const inCart = useMemo(() => new Set(inCartUnitIds), [inCartUnitIds]);

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return tags;
		return tags.filter(
			(tag) =>
				tag.barcode.toLowerCase().includes(term) ||
				tag.requestNo.toLowerCase().includes(term) ||
				String(tag.unitNo) === term,
		);
	}, [tags, search]);

	const selectable = filtered.filter((tag) => !inCart.has(tag.id));
	const availableCount = tags.filter((tag) => !inCart.has(tag.id)).length;

	const toggle = (id: number) =>
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const allFilteredSelected =
		selectable.length > 0 && selectable.every((tag) => selected.has(tag.id));

	const toggleAllFiltered = () =>
		setSelected((current) => {
			const next = new Set(current);
			if (allFilteredSelected) selectable.forEach((tag) => next.delete(tag.id));
			else selectable.forEach((tag) => next.add(tag.id));
			return next;
		});

	// Typing/pasting one exact tag code and pressing Enter ticks it.
	const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		const term = search.trim().toLowerCase();
		const exact = tags.find((tag) => tag.barcode.toLowerCase() === term);
		if (exact && !inCart.has(exact.id)) {
			setSelected((current) => new Set(current).add(exact.id));
			setSearch('');
		}
	};

	const handleAdd = () => {
		if (!variant) return;
		const chosen = tags.filter((tag) => selected.has(tag.id) && !inCart.has(tag.id));
		if (chosen.length === 0) return;
		onAdd(variant, chosen);
		setIsOpen(false);
	};

	if (!variant) return null;

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isScrollable isCentered titleId='unitTagPicker'>
			<ModalHeader setIsOpen={setIsOpen}>
				<ModalTitle id='unitTagPicker'>
					<Icon icon='QrCode' className='me-2 text-primary' />
					Pick barcode — {variant.productName ?? variant.sku}
				</ModalTitle>
			</ModalHeader>
			<ModalBody>
				<div className='d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3'>
					<div className='text-muted small'>
						{variant.sku}
						{[variant.size, variant.color].filter(Boolean).length > 0 &&
							` · ${[variant.size, variant.color].filter(Boolean).join(' / ')}`}
						{' · '}
						{formatCurrency(Number(variant.sellingPrice))} each
					</div>
					<div className='small fw-semibold'>
						{isLoading ? 'Loading tags…' : `${availableCount} tag${availableCount === 1 ? '' : 's'} available`}
					</div>
				</div>

				<Input
					type='search'
					placeholder='Search or type a barcode, then press Enter…'
					value={search}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
					onKeyDown={handleSearchKeyDown}
					autoFocus
				/>

				{isError && (
					<Alert color='danger' isLight className='mt-3 mb-0'>
						Couldn&apos;t load barcode tags for this item. Please try again.
					</Alert>
				)}

				{!isLoading && !isError && tags.length === 0 && (
					<Alert color='warning' isLight className='mt-3 mb-0'>
						No barcode tags in stock for this item at this showroom, so it can&apos;t be sold by manual
						add. Items need a tag from a goods transfer (Barcode &amp; Issue) before they can be sold
						here.
					</Alert>
				)}

				{tags.length > 0 && (
					<div className='table-responsive mt-3' style={{ maxHeight: 360, overflowY: 'auto' }}>
						<table className='table table-sm table-hover align-middle mb-0'>
							<thead className='table-light' style={{ position: 'sticky', top: 0, zIndex: 1 }}>
								<tr>
									<th style={{ width: 40 }}>
										<input
											type='checkbox'
											className='form-check-input'
											aria-label='Select all shown'
											checked={allFilteredSelected}
											disabled={selectable.length === 0}
											onChange={toggleAllFiltered}
										/>
									</th>
									<th>Barcode</th>
									<th>Unit</th>
									<th>Transfer</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((tag) => {
									const alreadyInCart = inCart.has(tag.id);
									return (
										<tr
											key={tag.id}
											role='button'
											className={alreadyInCart ? 'text-muted' : ''}
											style={{ cursor: alreadyInCart ? 'default' : 'pointer' }}
											onClick={() => !alreadyInCart && toggle(tag.id)}>
											<td>
												<input
													type='checkbox'
													className='form-check-input'
													aria-label={`Select ${tag.barcode}`}
													checked={alreadyInCart || selected.has(tag.id)}
													disabled={alreadyInCart}
													onChange={() => toggle(tag.id)}
													onClick={(e) => e.stopPropagation()}
												/>
											</td>
											<td className='font-monospace'>
												{tag.barcode}
												{alreadyInCart && <span className='ms-2 small'>(in cart)</span>}
											</td>
											<td>{tag.unitNo}</td>
											<td className='small text-muted'>{tag.requestNo}</td>
										</tr>
									);
								})}
								{filtered.length === 0 && (
									<tr>
										<td colSpan={4} className='text-center text-muted small py-3'>
											No tag matches “{search}”.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</ModalBody>
			<ModalFooter>
				<Button color='light' onClick={() => setIsOpen(false)}>
					Cancel
				</Button>
				<Button color='primary' icon='AddShoppingCart' isDisable={selected.size === 0} onClick={handleAdd}>
					{selected.size === 0
						? 'Select a barcode'
						: `Add ${selected.size} to cart · ${formatCurrency(selected.size * Number(variant.sellingPrice))}`}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default UnitTagPickerModal;
