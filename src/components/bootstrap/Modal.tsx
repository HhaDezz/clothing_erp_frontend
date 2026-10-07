import React, {
	FC,
	forwardRef,
	HTMLAttributes,
	ReactElement,
	ReactNode,
	useLayoutEffect,
	useRef,
} from 'react';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import Portal from '../../layout/Portal/Portal';
import TagWrapper from '../TagWrapper';
import useEventListener from '../../hooks/useEventListener';
import { TModalFullScreen, TModalSize } from '../../type/modal-type';

let openModalCount = 0;
let openModalsStack: any[] = [];

interface IModalTitleProps extends HTMLAttributes<HTMLElement> {
	id: string;
	children: ReactNode;
	className?: string;
	tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span';
}
export const ModalTitle = forwardRef<HTMLHeadingElement, IModalTitleProps>(
	({ tag = 'h5', id, children, className, ...props }, ref) => {
		return (
			<TagWrapper
				tag={tag}
				ref={ref}
				id={id}
				className={classNames('modal-title', className)}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}>
				{children}
			</TagWrapper>
		);
	},
);
ModalTitle.displayName = 'ModalTitle';

interface IModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactElement<IModalTitleProps> | ReactNode;
	className?: string;
	setIsOpen?(...args: unknown[]): unknown | undefined;
}
export const ModalHeader = forwardRef<HTMLDivElement, IModalHeaderProps>(
	({ children, className, setIsOpen, ...props }, ref) => {
		return (
			<div ref={ref} className={classNames('modal-header', className)} {...props}>
				{children}
				{setIsOpen && (
					<button
						type='button'
						className='btn-close'
						data-bs-dismiss='modal'
						aria-label='Close'
						onClick={() => setIsOpen(false)}
					/>
				)}
			</div>
		);
	},
);
ModalHeader.displayName = 'ModalHeader';

interface IModalBodyProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	className?: string;
}
export const ModalBody = forwardRef<HTMLDivElement, IModalBodyProps>(
	({ children, className, ...props }, ref) => {
		return (
			<div ref={ref} className={classNames('modal-body', className)} {...props}>
				{children}
			</div>
		);
	},
);
ModalBody.displayName = 'ModalBody';

interface IModalFooterProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	className?: string;
}
export const ModalFooter = forwardRef<HTMLDivElement, IModalFooterProps>(
	({ children, className, ...props }, ref) => {
		return (
			<div ref={ref} className={classNames('modal-footer', className)} {...props}>
				{children}
			</div>
		);
	},
);
ModalFooter.displayName = 'ModalFooter';

interface IModalProps extends Record<string, any> {
	children: ReactNode;
	isOpen: boolean;
	setIsOpen(...args: unknown[]): unknown;
	id?: string | undefined;
	titleId?: string;
	isStaticBackdrop?: boolean;
	isScrollable?: boolean;
	isCentered?: boolean;
	size?: TModalSize;
	fullScreen?: TModalFullScreen;
	isAnimation?: boolean;
}
const Modal: FC<IModalProps> = ({
	children,
	isOpen,
	setIsOpen,
	id,
	titleId,
	isStaticBackdrop,
	isScrollable,
	isCentered,
	size,
	fullScreen,
	isAnimation = true,
	...props
}) => {
	const refModal = useRef(null);
	const ref = useRef(null);

	// <body> modal-open class (presentation)
	useLayoutEffect(() => {
		const modalElement = refModal.current;
		if (isOpen) {
			openModalCount += 1;
			openModalsStack.push(modalElement);
			document.body.classList.add('modal-open');
		}
		return () => {
			if (isOpen) {
				openModalCount -= 1;
				openModalsStack = openModalsStack.filter((m) => m !== modalElement);
				if (openModalCount <= 0) {
					openModalCount = 0;
					document.body.classList.remove('modal-open');
				}
			}
		};
	}, [isOpen]);

	// Backdrop close function
	const closeModal = (event: { target: any }) => {
		// Only close if the mousedown was exactly on the backdrop (refModal.current)
		// and not on its children (the dialog box itself)
		if (refModal.current && event.target === refModal.current && !isStaticBackdrop) {
			setIsOpen(false);
		}
	};
	useEventListener('mousedown', closeModal);
	useEventListener('touchstart', closeModal); // Touchscreen

	// Backdrop static function
	const modalStatic = (event: { target: any }) => {
		if (refModal.current && event.target === refModal.current && isStaticBackdrop) {
			// @ts-ignore
			refModal.current.classList.add('modal-static');
			// @ts-ignore
			setTimeout(() => refModal.current.classList.remove('modal-static'), 300);
		}
	};
	useEventListener('mousedown', modalStatic);
	useEventListener('touchstart', modalStatic); // Touchscreen

	// Keypress close function
	const escFunction = (event: { key: string }) => {
		if (event.key === 'Escape') {
			// Only close the topmost modal
			if (openModalsStack[openModalsStack.length - 1] === refModal.current) {
				setIsOpen(false);
			}
		}
	};
	useEventListener('keydown', escFunction);

	const ANIMATION_PROPS = isAnimation
		? {
				initial: { opacity: 0, y: '-50%' },
				animate: { opacity: 1, x: '0%', y: '0%' },
				exit: { opacity: 0, y: '-50%' },
				transition: { ease: 'easeInOut', duration: 0.3 },
			}
		: null;

	return (
		<Portal>
			<AnimatePresence mode='wait'>
				{isOpen && (
					<>
						<motion.div
							ref={refModal}
							key='modal'
							className={classNames('modal', { fade: isAnimation }, 'show')}
							role='dialog'
							style={{ display: 'block' }}
							id={id}
							tabIndex={-1}
							aria-labelledby={titleId}
							aria-hidden='true'
							data-bs-backdrop={isStaticBackdrop ? 'static' : null}
							data-bs-keyboard={isStaticBackdrop ? 'false' : null}
							{...ANIMATION_PROPS}
							{...props}>
							<div
								ref={ref}
								className={classNames('modal-dialog', {
									'modal-dialog-scrollable': isScrollable,
									'modal-dialog-centered': isCentered,
									[`modal-${size}`]: size,
									[`modal-fullscreen${
										typeof fullScreen === 'string' ? `-${fullScreen}-down` : ''
									}`]: fullScreen,
								})}>
								<div className='modal-content'>{children}</div>
							</div>
						</motion.div>
						<div
							className={classNames('modal-backdrop', { fade: isAnimation }, 'show')}
						/>
					</>
				)}
			</AnimatePresence>
		</Portal>
	);
};

export default Modal;
