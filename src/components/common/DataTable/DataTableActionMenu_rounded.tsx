import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

const DataTableActionMenu = ({ actions }: Props) => {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

	const buttonRef = useRef<HTMLButtonElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const updatePosition = () => {
		if (!buttonRef.current) return;

		const rect = buttonRef.current.getBoundingClientRect();

		// Anchor the portal to the exact dimensions of the trigger button
		setPosition({
			top: rect.top,
			left: rect.left,
			width: rect.width,
			height: rect.height,
		});
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

			if (buttonRef.current?.contains(target) || containerRef.current?.contains(target)) {
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
			{/* Main Trigger Button */}
			<button
				ref={buttonRef}
				type='button'
				className={`btn btn-light btn-sm rounded-circle ${open ? 'active' : ''}`}
				style={{
					width: '32px',
					height: '32px',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					transition: 'transform 0.2s ease',
					transform: open ? 'rotate(90deg)' : 'rotate(0deg)', // Optional: spins the dots when opened
				}}
				onClick={() => setOpen((prev) => !prev)}
				title='Actions'>
				<i className='ti ti-dots-vertical' />
			</button>

			{/* Popping Rounded Icons Portal */}
			{createPortal(
				<div
					ref={containerRef}
					style={{
						position: 'fixed',
						top: position.top,
						left: position.left,
						width: position.width,
						height: position.height,
						zIndex: 9999,
						pointerEvents: open ? 'auto' : 'none',
					}}>
					{actions.map((action, index) => {
						// Calculate distance: each button pops out 40px further to the left
						const distanceX = (index + 1) * -42;

						return (
							<button
								key={action.key}
								type='button'
								title={action.label}
								className={`btn btn-sm shadow-sm d-flex align-items-center justify-content-center ${
									action.className ?? 'btn-light'
								}`}
								style={{
									position: 'absolute',
									top: '50%',
									left: '50%',
									width: '32px',
									height: '32px',
									borderRadius: '50%',
									marginTop: '-16px', // Center vertically based on height
									marginLeft: '-16px', // Center horizontally based on width

									// The magic: Spring out to the left and scale up
									transform: open
										? `translate(${distanceX}px, 0) scale(1)`
										: `translate(0, 0) scale(0)`,
									opacity: open ? 1 : 0,

									// Staggered bouncy transition
									transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.04}s, 
                                          opacity 0.2s ease ${index * 0.04}s`,
								}}
								onClick={() => {
									action.onClick();
									setOpen(false);
								}}>
								<i className={action.icon} />
							</button>
						);
					})}
				</div>,
				document.body,
			)}
		</>
	);
};

export default DataTableActionMenu;
