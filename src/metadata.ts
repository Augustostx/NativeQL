import { ColumnType, RelationType, ListenerType } from './enums';
import { ColumnOptions, RelationOptions, ValueTransformer } from './types';

/**
 * Metadata for a database column.
 */
export interface ColumnMetadata {
    target: Function;
    propertyName: string;
    options: ColumnOptions;
    mode?: 'regular' | 'createDate' | 'updateDate' | 'deleteDate' | 'version' | 'objectId';
}

/**
 * Metadata for an entity listener method.
 */
export interface EntityListenerMetadata {
    target: Function;
    propertyName: string;
    type: ListenerType;
}

/**
 * Metadata for a database entity (table).
 */
export interface EntityMetadata {
    target: Function;
    name: string;
    tableName: string;
}

/**
 * Metadata for an entity relationship.
 */
export interface RelationMetadata {
    target: Function;
    propertyName: string;
    relationType: RelationType;
    type: Function | string;
    inverseSide?: string | ((object: any) => any);
    options?: RelationOptions;
    joinTable?: boolean;
    joinTableName?: string;
    joinColumn?: boolean;
    joinColumnName?: string;
}

/**
 * Metadata for a JoinColumn decorator.
 */
export interface JoinColumnMetadata {
    target: Function;
    propertyName: string;
    name?: string;
}

/**
 * Metadata for a JoinTable decorator.
 */
export interface JoinTableMetadata {
    target: Function;
    propertyName: string;
    name?: string;
}

/**
 * Metadata for a database index.
 */
export interface IndexMetadata {
    target: Function;
    name?: string;
    columns: string[];
    unique?: boolean;
}

/**
 * Storage for all entity metadata arguments.
 */
export class MetadataArgsStorage {
    columns: ColumnMetadata[] = [];
    tables: EntityMetadata[] = [];
    relations: RelationMetadata[] = [];
    indices: IndexMetadata[] = [];
    entityListeners: EntityListenerMetadata[] = [];
    joinTables: JoinTableMetadata[] = [];
    joinColumns: JoinColumnMetadata[] = [];

    findTable(target: Function): EntityMetadata | undefined {
        return this.tables.find(table => table.target === target);
    }

    findColumns(target: Function): ColumnMetadata[] {
        return this.columns.filter(column => column.target.constructor === target.constructor && column.target === target);
    }

    findRelations(target: Function): RelationMetadata[] {
        return this.relations.filter(relation => relation.target.constructor === target.constructor && relation.target === target);
    }

    findIndices(target: Function): IndexMetadata[] {
        return this.indices.filter(index => index.target.constructor === target.constructor && index.target === target);
    }

    findListeners(target: Function, type: ListenerType): EntityListenerMetadata[] {
        return this.entityListeners.filter(listener =>
            listener.target.constructor === target.constructor &&
            listener.target === target &&
            listener.type === type
        );
    }
}

export const activeMetadataArgsStorage = new MetadataArgsStorage();

/**
 * Gets the global metadata arguments storage.
 */
export function getMetadataArgsStorage(): MetadataArgsStorage {
    return activeMetadataArgsStorage;
}
