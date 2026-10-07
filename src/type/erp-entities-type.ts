export type EntityId = string | number;
export type EntityStatus = 'active' | 'inactive' | string;

export interface EntityCodeRef {
	id?: EntityId;
	name?: string | null;
	code?: string | null;
}

export interface UserRef {
	id?: EntityId;
	name?: string | null;
	email?: string | null;
}

export interface BranchRef {
	id?: EntityId;
	name?: string | null;
	code?: string | null;
}

export interface DesignationEntity {
	id?: EntityId;
	name: string;
	code: string;
	description?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface DesignationPayload {
	name: string;
	code: string;
	description?: string;
	company_id?: string;
}

export interface ZoneEntity {
	id?: EntityId;
	name: string;
	code: string;
	created_at?: string;
	updated_at?: string;
}

export interface ZonePayload {
	name: string;
	code: string;
	company_id?: string;
}

export interface RegionEntity {
	id?: EntityId;
	name: string;
	code: string;
	zone_id?: EntityId | null;
	zone?: EntityCodeRef | null;
	created_at?: string;
	updated_at?: string;
}

export interface RegionPayload {
	name: string;
	code: string;
	zone_id?: EntityId | null;
	company_id?: string;
}

export interface TerritoryEntity {
	id?: EntityId;
	name: string;
	code: string;
	region_id?: EntityId | null;
	region?: EntityCodeRef | null;
	created_at?: string;
	updated_at?: string;
}

export interface TerritoryPayload {
	name: string;
	code: string;
	region_id?: EntityId | null;
	company_id?: string;
}

export interface SupervisorAreaEntity {
	id?: EntityId;
	name: string;
	code: string;
	territory_id?: EntityId | null;
	territory?: EntityCodeRef | null;
	created_at?: string;
	updated_at?: string;
}

export interface SupervisorAreaPayload {
	name: string;
	code: string;
	territory_id?: EntityId | null;
	company_id?: string;
}

export interface DistributorAreaEntity {
	id?: EntityId;
	name: string;
	code: string;
	supervisor_area_id?: EntityId | null;
	supervisor_area?: EntityCodeRef | null;
	created_at?: string;
	updated_at?: string;
}

export interface DistributorAreaPayload {
	name: string;
	code: string;
	supervisor_area_id?: EntityId | null;
	company_id?: string;
}

export interface RouteEntity {
	id?: EntityId;
	name: string;
	code?: string | null;
	distributor_area_id?: EntityId | null;
	distributor_area?: EntityCodeRef | null;
	created_at?: string;
	updated_at?: string;
}

export interface RoutePayload {
	name: string;
	code?: string;
	distributor_area_id?: EntityId | null;
	company_id?: string;
}

export interface TownEntity {
	id?: EntityId;
	name: string;
	code: string;
	created_at?: string;
	updated_at?: string;
}

export interface TownPayload {
	name: string;
	code: string;
	company_id?: string;
}

export interface TownRouteEntity {
	id?: EntityId;
	route_id?: EntityId | null;
	route?: EntityCodeRef | null;
	route_name?: string | null;
	town_ids?: EntityId[];
	towns?: string[] | TownEntity[];
	zone_name?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface TownRoutePayload {
	route_id: EntityId;
	town_ids?: EntityId[];
	company_id?: string;
}

export interface LoanChargeEntity {
	id?: EntityId;
	code: string;
	name: string;
	status?: EntityStatus;
	created_at?: string;
	updated_at?: string;
}

export interface LoanChargePayload {
	code: string;
	name: string;
	status?: EntityStatus;
	company_id?: string;
}

export interface UserEntity {
	id?: EntityId;
	photo?: string | null;
	profile_photo_path?: string | null;
	name: string;
	email: string;
	phone?: string | null;
	status?: EntityStatus;
	role?: string | null;
	role_id?: EntityId | null;
	user_type?: string | null;
	branch_id?: EntityId | null;
	branch?: string | BranchRef | null;
	designation_id?: EntityId | null;
	designation?: string | DesignationEntity | null;
	supervisor_area_id?: EntityId | null;
	supervisor_area?: string | SupervisorAreaEntity | null;
	report_to_user_id?: EntityId | null;
	report_to_user?: string | UserRef | null;
	created_at?: string;
	updated_at?: string;
}

export interface UserPayload {
	name: string;
	email: string;
	phone?: string;
	user_type?: string;
	password?: string;
	password_confirmation?: string;
	branch_id?: EntityId | null;
	designation_id?: EntityId | null;
	role_id?: EntityId | null;
	supervisor_area_id?: EntityId | null;
	report_to_user_id?: EntityId | null;
	photo?: string | null;
	image_name?: string;
	image_format?: string;
	status?: EntityStatus;
	company_id?: string;
}

export interface BusinessUnitEntity {
	id?: EntityId;
	name: string;
	code: string;
	address?: string | null;
	contact_number?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface BusinessUnitPayload {
	name: string;
	code: string;
	address?: string;
	contact_number?: string;
	company_id?: string;
}

export interface BranchEntity {
	id?: EntityId;
	name: string;
	code: string;
	business_unit_id?: EntityId | null;
	business_unit?: EntityCodeRef | null;
	zone_id?: EntityId | null;
	zone?: EntityCodeRef | null;
	region_id?: EntityId | null;
	region?: EntityCodeRef | null;
	address?: string | null;
	latitude?: string | null;
	longitude?: string | null;
	contact_number?: string | null;
	status?: EntityStatus;
	branch_manager_id?: EntityId | null;
	branch_manager?: UserRef | null;
	created_at?: string;
	updated_at?: string;
}

export interface BranchPayload {
	name: string;
	code: string;
	business_unit_id?: EntityId | null;
	zone_id?: EntityId | null;
	region_id?: EntityId | null;
	address?: string;
	latitude?: string;
	longitude?: string;
	contact_number?: string;
	branch_manager_id?: EntityId | null;
	status?: EntityStatus;
	company_id?: string;
}

export interface WarehouseEntity {
	id?: EntityId;
	name: string;
	code: string;
	branch_id?: EntityId | null;
	branch?: BranchRef | null;
	address?: string | null;
	status?: EntityStatus;
	created_at?: string;
	updated_at?: string;
}

export interface WarehousePayload {
	name: string;
	code: string;
	branch_id?: EntityId | null;
	address?: string;
	status?: EntityStatus;
	company_id?: string;
}

export interface BranchSettingEntity {
	id?: EntityId;
	branch_id?: EntityId | null;
	branch?: BranchRef | null;
	default_currency?: string | null;
	exchange_rate?: string | number | null;
	tax_percentage?: string | number | null;
	tax_type?: string | null;
	timezone?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface BranchSettingPayload {
	branch_id: EntityId;
	default_currency: string;
	exchange_rate?: string | number;
	tax_percentage?: string | number;
	tax_type?: string;
	timezone?: string;
	company_id?: string;
}

export interface SupplierContact {
	contact_name?: string;
	email?: string;
	phone?: string;
}

export interface SupplierBankDetail {
	bank_name?: string;
	account_name?: string;
	account_number?: string;
	payment_type?: string;
	due_date?: string;
	notes?: string;
}

export interface SupplierEntity {
	id?: EntityId;
	supplier_name: string;
	code: string;
	country?: string | null;
	telephone?: string | null;
	address?: string | null;
	contacts?: SupplierContact[];
	bank_details?: SupplierBankDetail[];
	created_at?: string;
	updated_at?: string;
}

export interface SupplierPayload {
	supplier_name: string;
	code: string;
	country?: string;
	telephone?: string;
	address?: string;
	contacts?: SupplierContact[];
	bank_details?: SupplierBankDetail[];
	company_id?: string;
}
