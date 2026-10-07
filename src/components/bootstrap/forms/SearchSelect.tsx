import React, {
	forwardRef,
	HTMLAttributes,
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react';
import classNames from 'classnames';
// @ts-ignore
import useEventOutside from '@omtanke/react-use-event-outside';
import Validation from './Validation';

export interface SearchSelectOption {
	value?: string | number;
	text?: string | number;
	label?: string | number;
}

interface ISearchSelectProps extends HTMLAttributes<HTMLInputElement> {
	id?: string;
	className?: string;
	name?: string;
	ariaLabel: string;
	placeholder?: string;
	searchPlaceholder?: string;
	size?: 'lg' | 'sm';
	disabled?: boolean;
	required?: boolean;
	ariaDescribedby?: string;
	ariaLabelledby?: string;
	title?: string;
	value?: string;
	defaultValue?: string;
	list?: SearchSelectOption[];
	isTouched?: boolean;
	isValid?: boolean;
	invalidFeedback?: string;
	validFeedback?: string;
	isValidMessage?: boolean;
	isTooltipFeedback?: boolean;
	emptyMessage?: string;
	onBlur?(...args: unknown[]): unknown;
	onChange?(...args: unknown[]): unknown;
	onFocus?(...args: unknown[]): unknown;
}

const SearchSelect = forwardRef<HTMLInputElement, ISearchSelectProps>(
	(
		{
			id,
			name,
			className,
			ariaLabel,
			placeholder,
			searchPlaceholder,
			size,
			disabled,
			required,
			ariaDescribedby,
			ariaLabelledby,
			title,
			value,
			defaultValue = '',
			list = [],
			isTouched,
			isValid,
			invalidFeedback,
			validFeedback,
			isValidMessage = true,
			isTooltipFeedback,
			emptyMessage = 'No results found',
			onBlur,
			onChange,
			onFocus,
			...props
		},
		ref,
	) => {
		const isControlled = typeof value !== 'undefined';
		const generatedId = useId();
		const inputId = id || `search-select-${generatedId}`;
		const listboxId = `${inputId}-listbox`;
		const wrapperRef = useRef<HTMLDivElement>(null);
		const hiddenInputRef = useRef<HTMLInputElement>(null);
		const searchInputRef = useRef<HTMLInputElement>(null);
		const [isOpen, setIsOpen] = useState(false);
		const [searchValue, setSearchValue] = useState('');
		const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''));
		const normalizedValue = isControlled ? String(value ?? '') : internalValue;

		useEffect(() => {
			if (!isControlled) {
				setInternalValue(String(defaultValue ?? ''));
			}
		}, [defaultValue, isControlled]);

		useImperativeHandle(ref, () => hiddenInputRef.current as HTMLInputElement);

		const options = useMemo(
			() =>
				list.map((option) => ({
					value: String(option.value ?? ''),
					label: String(option.label ?? option.text ?? option.value ?? ''),
				})),
			[list],
		);

		const selectedOption = useMemo(
			() => options.find((option) => option.value === normalizedValue),
			[options, normalizedValue],
		);

		const filteredOptions = useMemo(() => {
			const query = searchValue.trim().toLowerCase();

			if (!query) return options;

			return options.filter(
				(option) =>
					option.label.toLowerCase().includes(query) ||
					option.value.toLowerCase().includes(query),
			);
		}, [options, searchValue]);

		const [activeIndex, setActiveIndex] = useState(0);

		useEffect(() => {
			if (!isOpen) {
				setSearchValue('');
				setActiveIndex(0);
				return;
			}

			const selectedIndex = filteredOptions.findIndex(
				(option) => option.value === normalizedValue,
			);

			setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
		}, [filteredOptions, isOpen, normalizedValue]);

		useEffect(() => {
			if (!isOpen) return;

			searchInputRef.current?.focus();
		}, [isOpen]);

		const emitBlur = () => {
			onBlur?.({
				target: { name, value: normalizedValue },
				currentTarget: { name, value: normalizedValue },
			});
		};

		const closeMenu = (shouldBlur = false) => {
			setIsOpen(false);
			if (shouldBlur) emitBlur();
		};

		useEventOutside(wrapperRef, 'mousedown', () => {
			if (isOpen) closeMenu(true);
		});
		useEventOutside(wrapperRef, 'touchstart', () => {
			if (isOpen) closeMenu(true);
		});

		const emitChange = (nextValue: string) => {
			if (!isControlled) {
				setInternalValue(nextValue);
			}

			onChange?.({
				target: { name, value: nextValue },
				currentTarget: { name, value: nextValue },
			});
		};

		const handleSelect = (nextValue: string) => {
			emitChange(nextValue);
			setSearchValue('');
			setIsOpen(false);
			onBlur?.({
				target: { name, value: nextValue },
				currentTarget: { name, value: nextValue },
			});
		};

		const handleToggle = () => {
			if (disabled) return;

			if (!isOpen) {
				onFocus?.();
			}

			setIsOpen((current) => !current);
		};

		const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (disabled) return;

			if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
				event.preventDefault();
				if (!isOpen) {
					onFocus?.(event);
				}
				setIsOpen(true);
			}

			if (event.key === 'Escape' && isOpen) {
				event.preventDefault();
				closeMenu(true);
			}
		};

		const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
				return;
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault();
				setActiveIndex((current) => Math.max(current - 1, 0));
				return;
			}

			if (event.key === 'Enter') {
				event.preventDefault();
				const activeOption = filteredOptions[activeIndex];
				if (activeOption) handleSelect(activeOption.value);
				return;
			}

			if (event.key === 'Escape') {
				event.preventDefault();
				closeMenu(true);
			}
		};

		return (
			<div ref={wrapperRef} className={classNames('search-select', className)}>
				<input
					ref={hiddenInputRef}
					type='hidden'
					id={inputId}
					name={name}
					value={normalizedValue}
					required={required}
					disabled={disabled}
					{...props}
				/>
				<button
					type='button'
					className={classNames('form-select', 'text-start', 'search-select__trigger', {
						[`form-select-${size}`]: size,
						'text-muted': !selectedOption && placeholder,
						'is-invalid': !isValid && isTouched && invalidFeedback,
						'is-valid': !isValid && isTouched && !invalidFeedback,
					})}
					aria-label={ariaLabel}
					aria-describedby={ariaDescribedby}
					aria-labelledby={ariaLabelledby}
					aria-expanded={isOpen}
					aria-haspopup='listbox'
					aria-controls={listboxId}
					disabled={disabled}
					title={title}
					onClick={handleToggle}
					onKeyDown={handleTriggerKeyDown}>
					<span className='search-select__value'>
						{selectedOption?.label ||
							placeholder ||
							`Select ${ariaLabel?.toLowerCase() || 'option'}`}
					</span>
				</button>
				{isOpen && (
					<div className='search-select__menu dropdown-menu show'>
						<div className='search-select__search'>
							<input
								ref={searchInputRef}
								type='text'
								className='form-control form-control-sm'
								placeholder={
									searchPlaceholder || `Search ${ariaLabel?.toLowerCase() || 'option'}`
								}
								value={searchValue}
								onChange={(event) => setSearchValue(event.target.value)}
								onKeyDown={handleSearchKeyDown}
							/>
						</div>
						<div
							id={listboxId}
							role='listbox'
							aria-label={ariaLabel}
							className='search-select__options'>
							{filteredOptions.length > 0 ? (
								filteredOptions.map((option, index) => (
									<button
										key={option.value}
										type='button'
										role='option'
										className={classNames(
											'dropdown-item',
											'search-select__option',
											{
												active:
													option.value === normalizedValue ||
													index === activeIndex,
											},
										)}
										aria-selected={option.value === normalizedValue}
										onMouseEnter={() => setActiveIndex(index)}
										onClick={() => handleSelect(option.value)}>
										{option.label}
									</button>
								))
							) : (
								<div className='search-select__empty'>{emptyMessage}</div>
							)}
						</div>
					</div>
				)}
				{isValidMessage && (
					<Validation
						isTouched={isTouched}
						invalidFeedback={invalidFeedback}
						validFeedback={validFeedback}
						isTooltip={isTooltipFeedback}
					/>
				)}
			</div>
		);
	},
);

SearchSelect.displayName = 'SearchSelect';

export default SearchSelect;
