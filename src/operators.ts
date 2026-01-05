import { OperatorType } from './enums';

/**
 * Find operator for LIKE queries.
 */
export function Like(value: string) {
    return { operator: OperatorType.Like, value };
}

/**
 * Find operator for ILIKE queries (Case insensitive LIKE).
 */
export function ILike(value: string) {
    return { operator: OperatorType.ILike, value };
}

/**
 * Find operator for IN queries.
 */
export function In(values: any[]) {
    return { operator: OperatorType.In, value: values };
}

/**
 * Find operator for NOT queries. 
 * Can wrap another operator or a value.
 */
export function Not(value: any) {
    return { operator: OperatorType.Not, value };
}

/**
 * Find operator for Less Than queries.
 */
export function LessThan(value: number) {
    return { operator: OperatorType.LessThan, value };
}

/**
 * Find operator for More Than queries.
 */
export function MoreThan(value: number) {
    return { operator: OperatorType.GreaterThan, value };
}

/**
 * Find operator for Less Than And Equal queries.
 */
export function LessThanOrEqual(value: number) {
    return { operator: OperatorType.LessThanOrEqual, value };
}

/**
 * Find operator for More Than And Equal queries.
 */
export function MoreThanOrEqual(value: number) {
    return { operator: OperatorType.GreaterThanOrEqual, value };
}

/**
 * Find operator for Range queries.
 */
export function Between(start: any, end: any) {
    return { operator: OperatorType.Between, value: [start, end] };
}

/**
 * Find operator for IS NULL queries.
 */
export function IsNull() {
    return { operator: OperatorType.IsNull, value: null };
}

/**
 * Find operator for Equal queries (explicit).
 */
export function Equal(value: any) {
    return { operator: OperatorType.Equal, value };
}

/**
 * Find operator for Raw SQL queries.
 */
export function Raw(value: string) {
    return { operator: OperatorType.Raw, value };
}

/**
 * Convenience operator for LIKE '%value%'
 */
export function Contains(value: string) {
    return { operator: OperatorType.Like, value: `%${value}%` };
}

/**
 * Convenience operator for ILIKE '%value%'
 */
export function IContains(value: string) {
    return { operator: OperatorType.ILike, value: `%${value}%` };
}

/**
 * Convenience operator for LIKE 'value%'
 */
export function StartsWith(value: string) {
    return { operator: OperatorType.Like, value: `${value}%` };
}

/**
 * Convenience operator for ILIKE 'value%'
 */
export function IStartsWith(value: string) {
    return { operator: OperatorType.ILike, value: `${value}%` };
}

/**
 * Convenience operator for LIKE '%value'
 */
export function EndsWith(value: string) {
    return { operator: OperatorType.Like, value: `%${value}` };
}

/**
 * Convenience operator for ILIKE '%value'
 */
export function IEndsWith(value: string) {
    return { operator: OperatorType.ILike, value: `%${value}` };
}
