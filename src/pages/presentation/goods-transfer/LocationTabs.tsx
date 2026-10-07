import React from 'react';
import Nav, { NavItem } from '../../../components/bootstrap/Nav';
import Icon from '../../../components/icon/Icon';
import Tooltips from '../../../components/bootstrap/Tooltips';
import { usePermission } from '../../../hooks/usePermission';

export type LocationTabOption = { id: number; name: string };

interface Props {
	locations: LocationTabOption[];
	selectedId: number | 'ALL';
	onSelect: (id: number | 'ALL') => void;
	allLabel?: string;
}

/**
 * Per-location tab switcher for the Goods-to-Showroom workflow, mirroring
 * ImportReceivingModal's Bay-1 per-warehouse tabs: an "All" tab plus one tab
 * per candidate warehouse/showroom. A location the current user isn't
 * assigned to is shown but locked (not hidden), so a restricted user can see
 * other activity exists without being able to switch into it — SUPER_ADMIN,
 * or a user with no locations assigned at all, can switch to every tab.
 */
const LocationTabs: React.FC<Props> = ({ locations, selectedId, onSelect, allLabel = 'All' }) => {
	const { canActOnWarehouse } = usePermission();

	if (locations.length === 0) return null;

	return (
		<Nav design='tabs' className='mb-3 flex-wrap'>
			<NavItem isActive={selectedId === 'ALL'}>
				<span role='button' onClick={() => onSelect('ALL')}>
					{allLabel}
				</span>
			</NavItem>
			{locations.map((loc) => {
				const canSwitch = canActOnWarehouse(loc.id);
				const label = (
					<span
						role='button'
						onClick={() => {
							if (canSwitch) onSelect(loc.id);
						}}>
						{!canSwitch && <Icon icon='Lock' size='sm' className='me-1' />}
						{loc.name}
					</span>
				);
				return (
					<NavItem key={loc.id} isActive={selectedId === loc.id} isDisable={!canSwitch}>
						{canSwitch ? (
							label
						) : (
							<Tooltips title="Not assigned to you — you can't act on this one.">{label}</Tooltips>
						)}
					</NavItem>
				);
			})}
		</Nav>
	);
};

export default LocationTabs;
