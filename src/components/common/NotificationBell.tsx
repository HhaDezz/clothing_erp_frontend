import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../contexts/authContext';
import { useNotifications } from '../../hooks/useNotifications';
import { usePermission } from '../../hooks/usePermission';
import { PERMISSIONS } from '../../constants/permissions';
import { Department, NotificationResponse } from '../../api/notifications.api';
import { getNotificationRoute } from '../../helpers/notificationRoute';
import Button, { IButtonProps } from '../bootstrap/Button';
import Icon from '../icon/Icon';
import OffCanvas, {
	OffCanvasBody,
	OffCanvasHeader,
	OffCanvasTitle,
} from '../bootstrap/OffCanvas';
import Badge from '../bootstrap/Badge';
import useDarkMode from '../../hooks/useDarkMode';

interface INotificationBellProps {
	styledBtn?: IButtonProps;
}

type TTab = 'inbox' | 'history';

// Permissions that back a permission-scoped notification audience (an
// audience that isn't modeled as a Department) — e.g. Director/System Admin
// holders of import-higher-approve. See "Import Process Implementation
// Plan" doc, Phase 5.
const NOTIFICATION_TARGET_PERMISSIONS = [PERMISSIONS.HIGHER_APPROVE_IMPORT];

const NotificationCard: React.FC<{ n: NotificationResponse; onClick: () => void }> = ({
	n,
	onClick,
}) => (
	<div
		className={`p-3 mb-2 rounded border ${
			!n.read ? 'border-primary bg-l10-primary' : 'border-light bg-light'
		}`}
		style={{ cursor: 'pointer' }}
		onClick={onClick}
		role='button'
		tabIndex={0}
		onKeyDown={(e) => e.key === 'Enter' && onClick()}>
		<div className='d-flex align-items-start gap-2'>
			<Icon
				icon={n.read ? 'NotificationsNone' : 'Notifications'}
				color={n.read ? 'secondary' : 'primary'}
				size='lg'
			/>
			<div className='flex-grow-1'>
				<div className='fw-bold small'>{n.title}</div>
				<div className='text-muted small'>{n.message}</div>
				<div className='text-muted' style={{ fontSize: '0.7rem' }}>
					{new Date(n.createdAt).toLocaleString()}
				</div>
			</div>
			{!n.read && (
				<span
					className='bg-primary rounded-circle'
					style={{ width: 8, height: 8, marginTop: 6, flexShrink: 0 }}
				/>
			)}
		</div>
	</div>
);

const NotificationBell: React.FC<INotificationBellProps> = ({ styledBtn }) => {
	const { authUser } = useContext(AuthContext);
	const { hasPermission } = usePermission();
	const { darkModeStatus } = useDarkMode();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<TTab>('inbox');

	const depts = (authUser?.departments ?? []) as Department[];
	const notifPermissions = NOTIFICATION_TARGET_PERMISSIONS.filter(hasPermission);
	// The bell only makes sense for a user who both has SOME audience the
	// backend pushes to (a department, or a permission-scoped one like
	// Director/System Admin) and holds the notification-view permission (the
	// REST endpoints require it).
	const canSeeNotifications =
		(depts.length > 0 || notifPermissions.length > 0) && hasPermission(PERMISSIONS.SHOW_NOTIFICATION);

	const { notifications, unreadCount, markRead, markAllRead } = useNotifications(
		canSeeNotifications ? depts : [],
		canSeeNotifications ? notifPermissions : [],
	);

	// Inbox = unread only, so "Clear all" visibly empties it.
	// History = everything the backend returns — capped server-side to the
	// last 50 notifications for the user's departments/permissions, newest first.
	const inboxNotifications = useMemo(() => notifications.filter((n) => !n.read), [notifications]);
	const historyNotifications = notifications;

	const defaultBtnProps: IButtonProps = styledBtn ?? {
		color: darkModeStatus ? 'dark' : 'light',
		hoverShadow: 'default',
		isLight: !darkModeStatus,
		size: 'lg',
	};

	// Every notification is clickable now — mark-as-read stays conditional on
	// it actually being unread, but navigating to the record it refers to
	// applies whether it's already been read or not (e.g. from History).
	const handleNotificationClick = (n: NotificationResponse) => {
		if (!n.read) markRead(n.id);
		const path = getNotificationRoute(n);
		if (path) {
			setOpen(false);
			navigate(path);
		}
	};

	if (!canSeeNotifications) return null;

	const visibleList = tab === 'inbox' ? inboxNotifications : historyNotifications;

	return (
		<>
			<div className='col-auto position-relative'>
				<Button
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...defaultBtnProps}
					icon='Notifications'
					onClick={() => setOpen(true)}
					aria-label='Notifications'
				/>
				{unreadCount > 0 && (
					<Badge
						color='danger'
						className='position-absolute top-0 end-0 translate-middle rounded-pill'
						style={{ fontSize: '0.65rem', minWidth: '1.25rem' }}>
						{unreadCount > 99 ? '99+' : unreadCount}
					</Badge>
				)}
			</div>

			<OffCanvas
				id='notificationBellCanvas'
				titleId='notificationBellTitle'
				placement='end'
				isOpen={open}
				setOpen={setOpen}>
				<OffCanvasHeader setOpen={setOpen}>
					<OffCanvasTitle id='notificationBellTitle'>
						<Icon icon='Notifications' className='me-2' />
						Notifications
					</OffCanvasTitle>
				</OffCanvasHeader>
				<OffCanvasBody>
					{/* Tabs + permanent Clear-all action */}
					<div className='d-flex align-items-center justify-content-between mb-3'>
						<div className='btn-group' role='group' aria-label='Notification tabs'>
							<Button
								size='sm'
								color={tab === 'inbox' ? 'primary' : 'light'}
								isLight={tab !== 'inbox'}
								onClick={() => setTab('inbox')}>
								Inbox
								{unreadCount > 0 && (
									<Badge color='danger' isLight className='ms-2'>
										{unreadCount > 99 ? '99+' : unreadCount}
									</Badge>
								)}
							</Button>
							<Button
								size='sm'
								color={tab === 'history' ? 'primary' : 'light'}
								isLight={tab !== 'history'}
								onClick={() => setTab('history')}>
								History
							</Button>
						</div>
						<Button
							size='sm'
							color='light'
							icon='ClearAll'
							className='text-muted'
							isDisable={unreadCount === 0}
							onClick={markAllRead}
							data-tour='notifications-clear-all'>
							Clear all
						</Button>
					</div>

					{tab === 'history' && (
						<div className='text-muted small mb-2'>
							Showing the last {historyNotifications.length} notification
							{historyNotifications.length === 1 ? '' : 's'}
							{depts.length > 0
								? ` for your department${depts.length > 1 ? 's' : ''}`
								: ' for you'}
							.
						</div>
					)}

					{visibleList.length === 0 ? (
						<p className='text-muted text-center mt-4'>
							{tab === 'inbox' ? 'No new notifications.' : 'No notification history yet.'}
						</p>
					) : (
						visibleList.map((n) => (
							<NotificationCard
								key={n.id}
								n={n}
								onClick={() => handleNotificationClick(n)}
							/>
						))
					)}
				</OffCanvasBody>
			</OffCanvas>
		</>
	);
};

export default NotificationBell;
