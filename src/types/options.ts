import { OperatorType } from '../enums';

export interface FindOperator<T> {
    operator: OperatorType;
    value: T | T[];
}

export type FindOptionsWhere<T> = {
    [P in keyof T]?: T[P] | FindOperator<T[P]>;
};

export type FindOptionsOrder<T> = {
    [P in keyof T]?: "ASC" | "DESC" | "asc" | "desc" | 1 | -1;
};

export type FindOptionsRelations<T> = (keyof T | string)[];

export interface FindOneOptions<T> {
    select?: (keyof T | string)[];
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
    relations?: FindOptionsRelations<T>;
    order?: FindOptionsOrder<T>;
    withDeleted?: boolean;
}

export interface FindManyOptions<T> extends FindOneOptions<T> {
    skip?: number;
    take?: number;
}

export type QueryDeepPartialEntity<T> = {
    [P in keyof T]?: T[P] | (T[P] extends Array<infer U> ? U[] : T[P] extends object ? QueryDeepPartialEntity<T[P]> : any);
};
