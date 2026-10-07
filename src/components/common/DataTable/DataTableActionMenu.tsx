import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../icon/Icon';

interface Action {
	key: string;
	label: string;
	icon: string;
	className?: string;
	onClick: () => void;
}

interface Props {
	actions: Action[];
}

const MENU_WIDTH = 160;

const DataTableActionMenu = ({ actions }: Props) => {
	if (!actions.length) return null;

	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0 });

	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const updatePosition = () => {
		if (!buttonRef.current) return;

		const rect = buttonRef.current.getBoundingClientRect();

		let left = rect.right - MENU_WIDTH;
		const top = rect.bottom + 6;

		// Prevent menu going outside left side of screen
		if (left < 8) {
			left = 8;
		}

		// Prevent menu going outside right side of screen
		if (left + MENU_WIDTH > window.innerWidth - 8) {
			left = window.innerWidth - MENU_WIDTH - 8;
		}

		setPosition({ top, left });
	};

	useLayoutEffect(() => {
		if (open) {
			updatePosition();
		}
	}, [open]);

	useEffect(() => {
		if (!open) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;

			if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
				return;
			}

			setOpen(false);
		};

		const handleReposition = () => {
			updatePosition();
		};

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener('resize', handleReposition);
		window.addEventListener('scroll', handleReposition, true);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener('resize', handleReposition);
			window.removeEventListener('scroll', handleReposition, true);
		};
	}, [open]);

	return (
		<>
			<button
				ref={buttonRef}
				type='button'
				className='btn btn-light btn-sm d-flex align-items-center justify-content-center'
				onClick={() => setOpen((prev) => !prev)}
				title='Actions'>
				<Icon icon='MoreVert' size='lg' />
			</button>

			{createPortal(
				<div
					ref={menuRef}
					style={{
						position: 'fixed',
						top: position.top,
						left: position.left,
						zIndex: 9999,
						minWidth: MENU_WIDTH,
						background: 'var(--bs-body-bg)',
						border: '1px solid var(--bs-border-color)',
						borderRadius: 8,
						boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
						overflow: 'hidden',

						transformOrigin: 'top right',
						transform: open ? 'scale(1)' : 'scale(0.85)',
						opacity: open ? 1 : 0,
						pointerEvents: open ? 'auto' : 'none',
						transition:
							'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease',
					}}>
					{actions.map((action, index) => (
						<button
							key={action.key}
							type='button'
							className={`btn btn-sm w-100 text-start px-3 py-2 d-flex align-items-center gap-2 border-0 rounded-0 ${
								action.className ?? ''
							}`}
							style={{
								background: 'transparent',
								borderBottom:
									index < actions.length - 1
										? '1px solid var(--bs-border-color)'
										: 'none',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--bs-secondary-bg)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'transparent';
							}}
							onClick={() => {
								action.onClick();
								setOpen(false);
							}}>
							<i className={action.icon} />
							{action.label}
						</button>
					))}
				</div>,
				document.body,
			)}
		</>
	);
};

export default DataTableActionMenu;
