import React, { useEffect, useRef, useState } from 'react';

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
	const ref = useRef<HTMLDivElement>(null);

	// Close when clicking outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	return (
		<div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
			{/* Trigger button */}
			<button
				type='button'
				className='btn btn-light btn-sm'
				onClick={() => setOpen((prev) => !prev)}
				title='Actions'>
				<i className='ti ti-dots-vertical' />
			</button>

			{/* Dropdown */}
			<div
				style={{
					position: 'absolute',
					right: 0,
					top: '110%',
					zIndex: 1050,
					minWidth: 160,
					background: 'var(--bs-body-bg)',
					border: '1px solid var(--bs-border-color)',
					borderRadius: 8,
					boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
					overflow: 'hidden',
					// Animation
					transformOrigin: 'top right',
					transform: open ? 'scale(1)' : 'scale(0.85)',
					opacity: open ? 1 : 0,
					pointerEvents: open ? 'all' : 'none',
					transition:
						'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease',
				}}>
				{actions.map((action, index) => (
					<button
						key={action.key}
						type='button'
						className={`btn btn-sm w-100 text-start px-3 py-2 d-flex align-items-center gap-2 border-0 rounded-0 ${action.className ?? ''}`}
						style={{
							background: 'transparent',
							borderBottom:
								index < actions.length - 1
									? '1px solid var(--bs-border-color)'
									: 'none',
							transition: 'background 0.15s',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.background = 'var(--bs-secondary-bg)')
						}
						onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
						onClick={() => {
							action.onClick();
							setOpen(false);
						}}>
						<i className={action.icon} />
						{action.label}
					</button>
				))}
			</div>
		</div>
	);
};

export default DataTableActionMenu;
