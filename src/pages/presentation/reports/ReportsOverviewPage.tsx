import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Icon from '../../../components/icon/Icon';
import { PERMISSIONS } from '../../../constants/permissions';
import { reportsMenu } from '../../../menu';
import { usePermission } from '../../../hooks/usePermission';

const reportCards = [
	{
		title: 'Sales',
		description: 'Ready-made and sew-and-sell revenue, order and payment status.',
		icon: 'TrendingUp',
		color: 'primary',
		path: reportsMenu.sales.path,
	},
	{
		title: 'Payments & Cheques',
		description: 'Cash collections, invoices and cheque lifecycle information.',
		icon: 'Payments',
		color: 'success',
		path: reportsMenu.payments.path,
	},
	{
		title: 'Inventory',
		description: 'Available, reserved and low-stock quantities by location.',
		icon: 'Inventory2',
		color: 'info',
		path: reportsMenu.inventory.path,
	},
	{
		title: 'Purchasing',
		description: 'Purchase values, supplier commitments and receipt progress.',
		icon: 'LocalMall',
		color: 'warning',
		path: reportsMenu.purchasing.path,
	},
	{
		title: 'Production',
		description: 'Work-order workload, teams, quantities, due dates and stages.',
		icon: 'Factory',
		color: 'primary',
		path: reportsMenu.production.path,
	},
	{
		title: 'Quality Control',
		description: 'Passed, rejected and rework quantities with defect analysis.',
		icon: 'Verified',
		color: 'success',
		path: reportsMenu.quality.path,
	},
	{
		title: 'Deliveries',
		description: 'Pending dispatch, courier references and delivery completion.',
		icon: 'LocalShipping',
		color: 'info',
		path: reportsMenu.deliveries.path,
	},
	{
		title: 'Customers & Measurements',
		description: 'Customer measurement profiles, templates and version history.',
		icon: 'People',
		color: 'primary',
		path: reportsMenu.customers.path,
	},
	{
		title: 'Audit Logs',
		description: 'Security and business activity history by user and module.',
		icon: 'ListAlt',
		color: 'secondary',
		path: reportsMenu.auditLogs.path,
	},
];

const ReportsOverviewPage = () => {
	// Audit Logs is for system users only — don't offer the card to anyone else.
	const { isSuperAdmin } = usePermission();
	const visibleCards = reportCards.filter(
		(report) => isSuperAdmin || report.path !== reportsMenu.auditLogs.path,
	);

	return (
		<PageWrapper title='Report Center' requiredPermission={PERMISSIONS.SHOW_REPORT}>
			<SubHeader>
				<SubHeaderLeft>
					<Icon icon='Assessment' size='2x' color='primary' />
					<div className='ms-2'>
						<div className='fs-5 fw-bold'>Report Center</div>
						<div className='small text-muted'>
							Operational insight across the clothing ERP.
						</div>
					</div>
				</SubHeaderLeft>
			</SubHeader>
			<Page>
				<div className='alert alert-info d-flex align-items-start gap-2 mb-4'>
					<Icon icon='Info' className='mt-1' />
					<div>
						<strong>Every report is searchable and exportable.</strong>
						<div className='small'>
							Open a section to filter its records and export CSV, Excel, PDF or print
							output.
						</div>
					</div>
				</div>
				<div className='row g-4'>
					{visibleCards.map((report) => (
						<div className='col-md-6 col-xl-4' key={report.title}>
							<Link to={report.path} className='text-decoration-none text-reset'>
								<Card className='h-100 shadow-sm'>
									<CardBody className='p-4'>
										<div className='d-flex justify-content-between align-items-start gap-3'>
											<div>
												<h5 className='fw-bold mb-2'>{report.title}</h5>
												<p className='text-muted mb-0'>{report.description}</p>
											</div>
											<div
												className={`rounded-circle bg-${report.color} bg-opacity-10 p-3 flex-shrink-0`}>
												<Icon
													icon={report.icon as any}
													color={report.color as any}
													size='2x'
												/>
											</div>
										</div>
										<div className='text-primary fw-semibold mt-4'>
											Open report <Icon icon='ArrowForward' className='ms-1' />
										</div>
									</CardBody>
								</Card>
							</Link>
						</div>
					))}
				</div>
			</Page>
		</PageWrapper>
	);
};

export default ReportsOverviewPage;
