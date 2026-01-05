import { ColumnType } from '../enums';

/**
 * Transformer for converting values between entity and database.
 */
export interface ValueTransformer {
    to(value: any): any;
    from(value: any): any;
}

/**
 * Configuration options for a database column.
 */
export interface ColumnOptions {
    name?: string;
    type?: ColumnType | 'text' | 'string' | 'number' | 'boolean' | 'integer' | 'simple-array' | 'simple-json' | 'datetime' | 'date';
    primary?: boolean;
    generated?: boolean | 'uuid' | 'increment';
    nullable?: boolean;
    transformer?: ValueTransformer;
    default?: any;
    length?: number;
    precision?: number | null;
    scale?: number;
}

/**
 * Options for configuring relations.
 */
export interface RelationOptions {
    eager?: boolean;
    nullable?: boolean;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    cascade?: boolean | ("insert" | "update" | "remove" | "soft-remove" | "recover")[];
}

/**
 * Options for JoinColumn decorator.
 */
export interface JoinColumnOptions {
    name?: string;
    referencedColumnName?: string;
}

/**
 * Options for JoinTable decorator.
 */
export interface JoinTableOptions {
    name?: string;
    joinColumn?: { name?: string; referencedColumnName?: string };
    inverseJoinColumn?: { name?: string; referencedColumnName?: string };
}

/**
 * Options for Index decorator.
 */
export interface IndexOptions {
    unique?: boolean;
}

/**
 * Options for Entity decorator.
 */
export interface EntityOptions {
    name?: string;
    orderBy?: { [name: string]: 'ASC' | 'DESC' };
}

export * from './options';
