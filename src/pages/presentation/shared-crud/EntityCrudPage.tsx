import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, {
	SubHeaderLeft,
	SubHeaderRight,
	SubheaderSeparator,
} from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Button from '../../../components/bootstrap/Button';
import Icon from '../../../components/icon/Icon';
import DataTable from '../../../components/common/DataTable/DataTable';
import DataTableActionMenu from '../../../components/common/DataTable/DataTableActionMenu';
import showNotification from '../../../components/extras/showNotification';
import EntityCrudFormModal from './EntityCrudFormModal';
import { CrudEntityId, CrudEntityPageConfig, CrudMode, CrudFormValues } from './types';
import { createCrudItemApi, getCrudCollectionApi, updateCrudItemApi } from '../../../api/sharedCrud.api';
import { usePermission } from '../../../hooks/usePermission';

const EntityCrudPage = <T extends object & { id?: CrudEntityId }>({
	title,
	entityLabel,
	icon,
	fileName,
	initialItems = [],
	columns,
	fields,
	createItem,
	updateItem,
	hideEdit,
	customHeaderAction,
	permissions,
	api,
	validate,
}: CrudEntityPageConfig<T>) => {
	const { hasPermission } = usePermission();
	const queryClient = useQueryClient();
	const [localItems, setLocalItems] = useState<T[]>(initialItems);
	const [activeId, setActiveId] = useState<CrudEntityId | null>(null);
	const [mode, setMode] = useState<CrudMode>('add');
	const [isOpen, setIsOpen] = useState(false);

	const {
		data: apiItems = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: api ? [api.queryKey] : ['local', fileName],
		queryFn: () =>
			api
				? getCrudCollectionApi<Record<string, any>>(api.endpoint).then((items) =>
						items.map((item) => (api.mapItem ? api.mapItem(item) : (item as T))),
					)
				: Promise.resolve(localItems),
		enabled: !!api,
	});

	const items = api ? apiItems : localItems;

	const createMutation = useMutation({
		mutationFn: (payload: Record<string, any>) => createCrudItemApi(api!.endpoint, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: [api!.queryKey] });
			showNotification('Created', `${entityLabel} saved successfully.`, 'success');
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: CrudEntityId; payload: Record<string, any> }) =>
			updateCrudItemApi(api!.endpoint, id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: [api!.queryKey] });
			showNotification('Updated', `${entityLabel} updated successfully.`, 'success');
		},
	});

	const activeItem = items.find((item) => item.id?.toString() === activeId?.toString()) || null;
	const canView = hasPermission(permissions?.view);
	const canCreate = hasPermission(permissions?.create);
	const canUpdate = !hideEdit && hasPermission(permissions?.update);

	const openModal = (nextMode: CrudMode, id: CrudEntityId | null = null) => {
		setMode(nextMode);
		setActiveId(id);
		setIsOpen(true);
	};

	const handleSubmit = async (values: CrudFormValues) => {
		if (api) {
			try {
				if (mode === 'edit' && activeId !== null && activeItem) {
					await updateMutation.mutateAsync({
						id: activeId,
						payload: api.toUpdatePayload
							? api.toUpdatePayload(values, activeItem)
							: values,
					});
					return;
				}

				await createMutation.mutateAsync(
					api.toCreatePayload ? api.toCreatePayload(values) : values,
				);
				return;
			} catch (error) {
				const axiosError = error as {
					response?: {
						data?: {
							message?: string;
							errors?: Record<string, string[] | string>;
						};
					};
				};

				const fieldErrors = Object.entries(axiosError.response?.data?.errors || {}).reduce<
					Record<string, string>
				>((acc, [field, messages]) => {
					acc[field] = Array.isArray(messages) ? messages[0] : messages;
					return acc;
				}, {});

				if (!Object.keys(fieldErrors).length) {
					showNotification(
						'Request failed',
						axiosError.response?.data?.message || `Failed to save ${entityLabel}.`,
						'danger',
					);
				}

				throw { fieldErrors };
			}
		}

		if (mode === 'edit' && activeId !== null) {
			setLocalItems((current) =>
				current.map((item) =>
					item.id?.toString() === activeId.toString() ? updateItem(item, values) : item,
				),
			);
			return;
		}

		const nextId = Date.now();
		setLocalItems((current) => [...current, createItem(values, nextId)]);
	};

	return (
		<PageWrapper title={title} requiredPermission={permissions?.view}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon={icon as any} size='2x' color='primary' />
					<span className='fs-5 fw-bold ms-2'>{title}</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{customHeaderAction}
					{canCreate && (
						<>
							<SubheaderSeparator />
							<Button
								color='primary'
								isLight
								icon='AddBusiness'
								onClick={() => openModal('add')}>
								New {entityLabel}
							</Button>
						</>
					)}
				</SubHeaderRight>
			</SubHeader>

			<Page>
				<div className='row h-100'>
					<div className='col-12'>
						<Card stretch>
							<CardBody style={{ overflow: 'visible' }}>
								<DataTable
									columns={[
										...columns,
										{
											key: 'actions',
											label: '',
											align: 'right',
											sortable: false,
											searchable: false,
											render: (item) => (
												<DataTableActionMenu
													actions={[
														...(canView
															? [
																	{
																		key: 'view',
																		label: 'View',
																		icon: 'ti ti-eye',
																		className: 'text-info',
																		onClick: () =>
																			openModal('view', item.id ?? ''),
																	},
																]
															: []),
														...(canUpdate
															? [
																	{
																		key: 'edit',
																		label: 'Edit',
																		icon: 'ti ti-edit',
																		className: 'text-primary',
																		onClick: () =>
																			openModal('edit', item.id ?? ''),
																	},
																]
															: []),
													]}
												/>
											),
										},
									]}
									data={items}
									rowKey='id'
									loading={api ? isLoading : false}
									error={api ? error : null}
									fileName={fileName}
									showActions={false}
								/>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			<EntityCrudFormModal
				entityLabel={entityLabel}
				mode={mode}
				item={(activeItem as Record<string, unknown> | null) ?? null}
				isOpen={isOpen}
				setIsOpen={setIsOpen}
				fields={fields}
				onSubmit={handleSubmit}
				onEdit={canUpdate ? () => activeId !== null && openModal('edit', activeId) : undefined}
				validate={validate ? (values) => validate(values, { items, activeItem, mode }) : undefined}
			/>
		</PageWrapper>
	);
};

export default EntityCrudPage;
