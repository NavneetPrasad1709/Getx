export type TabType = 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | 'BOOSTING';
export type TabMode = 'BROWSE' | 'REVERSE';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'boolean'
  | 'file';

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  options?: string[];
  conditional?: string;
  helpText?: string;
}

export interface AddOn {
  name: string;
  label: string;
  description?: string;
  price?: number;
  default?: boolean;
}

export interface BoostingService {
  slug: string;
  name: string;
  icon: string;
  description: string;
  tagline?: string;
  formFields: FormField[];
  addons?: AddOn[];
  estimatedTime?: string;
}

export interface BrowseFilter {
  name: string;
  label: string;
  type: 'range' | 'select' | 'multiselect' | 'boolean';
  options?: string[];
  min?: number;
  max?: number;
}

export interface TabConfig {
  slug: string;
  name: string;
  icon: string;
  type: TabMode;
  tagline?: string;
  description?: string;
  browseFilters?: BrowseFilter[];
  productFields?: FormField[];
  subServices?: BoostingService[];
}

export interface GameConfig {
  slug: string;
  name: string;
  shortName?: string;
  description: string;
  icon: string;
  banner?: string;
  isActive: boolean;
  isLaunched: boolean;
  comingSoonAt?: string;
  sortOrder: number;
  tabs: TabConfig[];
  customRequest?: {
    enabled: boolean;
    maxImages: number;
    minDescription: number;
    requiredFields: string[];
  };
}
