import React, { Children, forwardRef, HTMLAttributes, ReactNode, useMemo } from 'react';
import classNames from 'classnames';
import Option, { IOptionsProps, Options } from '../Option';
import SearchSelect from './SearchSelect';
import Validation from './Validation';

interface ISelectProps extends Partial<IOptionsProps>, HTMLAttributes<HTMLSelectElement> {
	id?: string;
	className?: string;
	name?: string;
	children?: ReactNode;
	ariaLabel: string;
	placeholder?: string;
	searchable?: boolean;
	searchPlaceholder?: string;
	emptyMessage?: string;
	size?: 'lg' | 'sm';
	multiple?: boolean;
	disabled?: boolean;
	required?: boolean;
	ariaDescribedby?: string;
	ariaLabelledby?: string;
	title?: string;
	value?: string | string[];
	defaultValue?: string | string[];
	isTouched?: boolean;
	isValid?: boolean;
	invalidFeedback?: string;
	validFeedback?: string;
	isValidMessage?: boolean;
	isTooltipFeedback?: boolean;
	onBlur?(...args: unknown[]): unknown;
	onChange?(...args: unknown[]): unknown;
	onFocus?(...args: unknown[]): unknown;
	onInput?(...args: unknown[]): unknown;
	onInvalid?(...args: unknown[]): unknown;
	onSelect?(...args: unknown[]): unknown;
}
const Select = forwardRef<HTMLSelectElement, ISelectProps>(
	(
		{
			id,
			name,
			className,
			children,
			required,
			placeholder,
			searchable,
			searchPlaceholder,
			emptyMessage,
			ariaDescribedby,
			ariaLabelledby,
			ariaLabel,
			list,
			multiple,
			title,
			size,
			disabled,
			value,
			defaultValue,
			isValid,
			isTouched,
			invalidFeedback,
			validFeedback,
			isValidMessage = true,
			isTooltipFeedback,
			onBlur,
			onChange,
			onFocus,
			onInput,
			onInvalid,
			onSelect,
			...props
		},

		ref,
	) => {
		const isSearchEnabled = searchable !== false && !multiple;
		const searchOptions = useMemo(() => {
			if (list?.length) return list;

			return Children.toArray(children)
				.map((child) => {
					if (!React.isValidElement(child)) return null;

					const childProps = child.props as {
						value?: string | number;
						children?: ReactNode;
					};
					const childLabel = Array.isArray(childProps.children)
						? childProps.children.join('')
						: typeof childProps.children === 'string' ||
						  typeof childProps.children === 'number'
							? String(childProps.children)
							: '';

					return {
						value: childProps.value,
						label: childLabel,
					};
				})
				.filter((option) => option && option.value !== '') as NonNullable<
				IOptionsProps['list']
			>;
		}, [children, list]);

		if (isSearchEnabled) {
			return (
				<SearchSelect
					ref={ref as React.Ref<HTMLInputElement>}
					id={id}
					className={className}
					name={name}
					required={required}
					placeholder={placeholder}
					searchPlaceholder={searchPlaceholder}
					emptyMessage={emptyMessage}
					ariaDescribedby={ariaDescribedby}
					ariaLabelledby={ariaLabelledby}
					ariaLabel={ariaLabel}
					title={title}
					size={size}
					disabled={disabled}
					value={Array.isArray(value) ? value[0] : value}
					defaultValue={Array.isArray(defaultValue) ? defaultValue[0] : defaultValue}
					list={searchOptions}
					isValid={isValid}
					isTouched={isTouched}
					invalidFeedback={invalidFeedback}
					validFeedback={validFeedback}
					isValidMessage={isValidMessage}
					isTooltipFeedback={isTooltipFeedback}
					onBlur={onBlur}
					onChange={onChange}
					onFocus={onFocus}
				/>
			);
		}

		return (
			<>
				<select
					ref={ref}
					id={id}
					className={classNames(
						'form-select',
						{
							[`form-select-${size}`]: size,
							'text-muted': value === '' && placeholder,
							'is-invalid': !isValid && isTouched && invalidFeedback,
							'is-valid': !isValid && isTouched && !invalidFeedback,
						},
						className,
					)}
					name={name}
					aria-label={ariaLabel}
					aria-describedby={ariaDescribedby}
					aria-labelledby={ariaLabelledby}
					multiple={multiple}
					disabled={disabled}
					title={title}
					value={value}
					defaultValue={defaultValue}
					required={required}
					onBlur={onBlur}
					onChange={onChange}
					onFocus={onFocus}
					onInput={onInput}
					onInvalid={onInvalid}
					onSelect={onSelect}
					{...props}>
					{placeholder && (
						<Option value='' hidden>
							{placeholder}
						</Option>
					)}
					{children || (list && <Options list={list} />)}
				</select>
				{isValidMessage && (
					<Validation
						isTouched={isTouched}
						invalidFeedback={invalidFeedback}
						validFeedback={validFeedback}
						isTooltip={isTooltipFeedback}
					/>
				)}
			</>
		);
	},
);
Select.displayName = 'Select';

export default Select;
