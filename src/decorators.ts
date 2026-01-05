import 'reflect-metadata';
import { getMetadataArgsStorage } from './metadata';
import { ColumnType, RelationType, ListenerType } from './enums';
import { ColumnOptions, RelationOptions, JoinColumnOptions, JoinTableOptions, IndexOptions, EntityOptions } from './types';

/**
 * Marks a class as an entity.
 * @param nameOrOptions - Optional custom table name or options object.
 */
export function Entity(nameOrOptions?: string | EntityOptions): ClassDecorator {
    return function (target: Function) {
        let name = target.name;
        if (typeof nameOrOptions === 'string') {
            name = nameOrOptions;
        } else if (nameOrOptions && nameOrOptions.name) {
            name = nameOrOptions.name;
        }

        getMetadataArgsStorage().tables.push({
            target: target,
            name: name,
            tableName: name,
        });
    };
}

/**
 * Marks a property as a column in the database table.
 * @param options - Configuration options for the column (type, nullable, etc.).
 */
export function Column(options: ColumnOptions = {}): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName: propertyName as string,
            options: options,
        });
    };
}

/**
 * Marks a property as the primary key of the entity, which is automatically generated.
 * Defaults to an auto-incrementing integer.
 */
export function PrimaryGeneratedColumn(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName: propertyName as string,
            options: {
                primary: true,
                generated: true,
                type: ColumnType.Integer,
            },
        });
    };
}

// --- Relations ---

/**
 * Defines a one-to-one relationship between two entities.
 * @param typeFunction - Function returning the related entity class.
 * @param inverseSide - (Optional) Property on the related entity that points back to this entity.
 * @param options - (Optional) Relation options.
 */
export function OneToOne(typeFunction: (type?: any) => Function, options?: RelationOptions): PropertyDecorator;
export function OneToOne(typeFunction: (type?: any) => Function, inverseSide?: string | ((object: any) => any), options?: RelationOptions): PropertyDecorator;
export function OneToOne(typeFunction: (type?: any) => Function, inverseSideOrOptions?: string | ((object: any) => any) | RelationOptions, options?: RelationOptions): PropertyDecorator {
    let inverseSide: string | ((object: any) => any) | undefined;
    if (typeof inverseSideOrOptions === 'object') {
        options = inverseSideOrOptions as RelationOptions;
    } else {
        inverseSide = inverseSideOrOptions;
    }

    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().relations.push({
            target: object.constructor,
            propertyName: propertyName as string,
            relationType: RelationType.OneToOne,
            type: typeFunction,
            inverseSide: inverseSide,
            options: options
        });
    };
}

/**
 * Defines a many-to-one relationship between two entities.
 * @param typeFunction - Function returning the related entity class.
 * @param inverseSide - (Optional) Property on the related entity that points back to this entity.
 * @param options - (Optional) Relation options.
 */
export function ManyToOne(typeFunction: (type?: any) => Function, options?: RelationOptions): PropertyDecorator;
export function ManyToOne(typeFunction: (type?: any) => Function, inverseSide?: string | ((object: any) => any), options?: RelationOptions): PropertyDecorator;
export function ManyToOne(typeFunction: (type?: any) => Function, inverseSideOrOptions?: string | ((object: any) => any) | RelationOptions, options?: RelationOptions): PropertyDecorator {
    let inverseSide: string | ((object: any) => any) | undefined;
    if (typeof inverseSideOrOptions === 'object') {
        options = inverseSideOrOptions as RelationOptions;
    } else {
        inverseSide = inverseSideOrOptions;
    }

    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().relations.push({
            target: object.constructor,
            propertyName: propertyName as string,
            relationType: RelationType.ManyToOne,
            type: typeFunction,
            inverseSide: inverseSide,
            options: options
        });
    };
}

/**
 * Defines a one-to-many relationship between two entities.
 * @param typeFunction - Function returning the related entity class.
 * @param inverseSide - Property on the related entity that points back to this entity.
 * @param options - (Optional) Relation options.
 */
export function OneToMany(typeFunction: (type?: any) => Function, inverseSide: string | ((object: any) => any), options?: RelationOptions): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().relations.push({
            target: object.constructor,
            propertyName: propertyName as string,
            relationType: RelationType.OneToMany,
            type: typeFunction,
            inverseSide: inverseSide,
            options: options
        });
    };
}

/**
 * Defines a many-to-many relationship between two entities.
 * @param typeFunction - Function returning the related entity class.
 * @param inverseSide - (Optional) Property on the related entity that points back to this entity.
 * @param options - (Optional) Relation options.
 */
export function ManyToMany(typeFunction: (type?: any) => Function, options?: RelationOptions): PropertyDecorator;
export function ManyToMany(typeFunction: (type?: any) => Function, inverseSide?: string | ((object: any) => any), options?: RelationOptions): PropertyDecorator;
export function ManyToMany(typeFunction: (type?: any) => Function, inverseSideOrOptions?: string | ((object: any) => any) | RelationOptions, options?: RelationOptions): PropertyDecorator {
    let inverseSide: string | ((object: any) => any) | undefined;
    if (typeof inverseSideOrOptions === 'object') {
        options = inverseSideOrOptions as RelationOptions;
    } else {
        inverseSide = inverseSideOrOptions;
    }

    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().relations.push({
            target: object.constructor,
            propertyName: propertyName as string,
            relationType: RelationType.ManyToMany,
            type: typeFunction,
            inverseSide: inverseSide,
            options: options
        });
    };
}

/**
 * Specifies that the annotated property should be used to Join the columns of the relation.
 * Required on the owner side of OneToOne relations.
 * @param options - Options for the join column (name).
 */
export function JoinColumn(options?: JoinColumnOptions): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().joinColumns.push({
            target: object.constructor,
            propertyName: propertyName as string,
            name: options?.name
        });
    };
}

/**
 * Specifies that this side of the relationship owns the relationship and a join table will be created.
 * Required for ManyToMany relations on the owner side.
 * @param options - Options for the join table (name).
 */
export function JoinTable(options?: JoinTableOptions): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().joinTables.push({
            target: object.constructor,
            propertyName: propertyName as string,
            name: options?.name
        });
    };
}

// --- Indices ---

/**
 * Creates a database index on the table.
 * @param nameOrFields - Column name(s) or index name.
 * @param options - Index options (unique).
 */
export function Index(nameOrFields?: string | string[], options?: IndexOptions): ClassDecorator & PropertyDecorator {
    return function (target: Object | Function, propertyName?: string | symbol) {
        if (propertyName) {
           
            getMetadataArgsStorage().indices.push({
                target: target.constructor,
                columns: [propertyName as string],
                unique: options?.unique
            });
        } else {
            
            getMetadataArgsStorage().indices.push({
                target: target as Function,
                columns: Array.isArray(nameOrFields) ? nameOrFields : [nameOrFields as string],
                unique: options?.unique
            });
        }
    };
}

// --- Special Columns ---

/**
 * Special column that automatically stores the creation date.
 */
export function CreateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName: propertyName as string,
            options: { ...options, type: ColumnType.DateTime },
            mode: 'createDate'
        });
    };
}

/**
 * Special column that automatically stores the last update date.
 */
export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName: propertyName as string,
            options: { ...options, type: ColumnType.DateTime },
            mode: 'updateDate'
        });
    };
}

/**
 * Special column that automatically stores the deletion date (for soft deletes).
 */
export function DeleteDateColumn(options?: ColumnOptions): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName: propertyName as string,
            options: { ...options, type: ColumnType.DateTime, nullable: true },
            mode: 'deleteDate'
        });
    };
}

/**
 * Special column that stores a version number for optimistic locking.
 */
export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName: propertyName as string,
            options: { ...options, type: ColumnType.Integer },
            mode: 'version'
        });
    };
}

/**
 * Marks a column as generated (e.g. UUID).
 */
export function Generated(strategy: 'uuid' | 'increment' = 'increment'): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        const storage = getMetadataArgsStorage();
        const column = storage.columns.find(c => c.target === object.constructor && c.propertyName === propertyName);
        if (column) {
            column.options.generated = strategy;
        } else {
            getMetadataArgsStorage().columns.push({
                target: object.constructor,
                propertyName: propertyName as string,
                options: { generated: strategy },
                mode: 'regular'
            });
        }
    };
}

// --- Entity Listeners ---

/**
 * Calls the annotated method before the entity is inserted.
 */
export function BeforeInsert(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName as string,
            type: ListenerType.BeforeInsert
        });
    };
}

/**
 * Calls the annotated method after the entity is inserted.
 */
export function AfterInsert(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName as string,
            type: ListenerType.AfterInsert
        });
    };
}

/**
 * Calls the annotated method before the entity is updated.
 */
export function BeforeUpdate(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName as string,
            type: ListenerType.BeforeUpdate
        });
    };
}

/**
 * Calls the annotated method after the entity is updated.
 */
export function AfterUpdate(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName as string,
            type: ListenerType.AfterUpdate
        });
    };
}

/**
 * Calls the annotated method before the entity is removed.
 */
export function BeforeRemove(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName as string,
            type: ListenerType.BeforeRemove
        });
    };
}

/**
 * Calls the annotated method after the entity is removed.
 */
export function AfterRemove(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName as string,
            type: ListenerType.AfterRemove
        });
    };
}

/**
 * Calls the annotated method after the entity is loaded.
 */
export function AfterLoad(): PropertyDecorator {
    return function (object: Object, propertyName: string | symbol) {
        getMetadataArgsStorage().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName as string,
            type: ListenerType.AfterLoad
        });
    };
}
