import 'reflect-metadata';
import { SqliteDriver } from './driver';
export { SqliteDriver };
import { getMetadataArgsStorage } from './metadata';
import { SqlGenerator } from './sql-generator';
import { QueryBuilder } from './query-builder';
import { Repository } from './repository';
import { BaseEntity } from './base-entity';
import { ColumnType, RelationType, ListenerType } from './enums';
import { FindOptionsWhere, FindManyOptions, FindOneOptions, QueryDeepPartialEntity } from './types';

/**
 * Configuration options for the DataSource.
 */
export interface DataSourceOptions {
    /** The database driver (e.g., QuickSqlite or Mock). */
    driver: SqliteDriver;
    /** List of entity classes to be registered. */
    entities?: Function[];
    /** If true, standard schema synchronization will be performed on initialization. */
    synchronize?: boolean;
}

/**
 * The main entry point for interacting with the database.
 * Manages connections, entity metadata, and provides methods for persistence and querying.
 */
export class DataSource {
    readonly driver: SqliteDriver;
    readonly options: DataSourceOptions;
    private isInitialized = false;

    private static instance: DataSource;

    constructor(optionsOrDriver: DataSourceOptions | SqliteDriver) {
        if ('driver' in optionsOrDriver) {
            this.options = optionsOrDriver;
            this.driver = optionsOrDriver.driver;
        } else {
            this.driver = optionsOrDriver;
            this.options = { driver: optionsOrDriver };
        }
        DataSource.instance = this;
    }

    /**
     * Gets the gloabl singleton instance of the DataSource.
     * @throws Error if the DataSource has not been initialized.
     */
    static getManager(): DataSource {
        if (!DataSource.instance) {
            throw new Error("DataSource is not initialized. Call initialize() first.");
        }
        return DataSource.instance;
    }

    /**
     * Creates a new QueryBuilder for the given entity or table.
     * @param entityOrTableName - The entity class or table name to query.
     * @param alias - Optional alias for the table.
     */
    createQueryBuilder(entityOrTableName?: Function | string, alias?: string): QueryBuilder<any> {
        return new QueryBuilder(this, entityOrTableName, alias);
    }

    /**
     * Gets a Repository for the specific entity.
     * @param target - The entity class.
     */
    getRepository<Entity>(target: Function): Repository<Entity> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");
        return new Repository<Entity>(this, target, table);
    }

    /**
     * Initializes the data source.
     * Merges metadata and optionally synchronizes the database schema.
     */
    async initialize(): Promise<void> {
        this.isInitialized = true;

        const storage = getMetadataArgsStorage();
        for (const joinTable of storage.joinTables) {
            const relation = storage.relations.find(r => r.target === joinTable.target && r.propertyName === joinTable.propertyName);
            if (relation) {
                relation.joinTable = true;
                if (joinTable.name) {
                    relation.joinTableName = joinTable.name;
                }
            }
        }

        for (const joinColumn of storage.joinColumns) {
            const relation = storage.relations.find(r => r.target === joinColumn.target && r.propertyName === joinColumn.propertyName);
            if (relation) {
                relation.joinColumn = true;
                if (joinColumn.name) {
                    relation.joinColumnName = joinColumn.name;
                }
            }
        }

        await this.query('PRAGMA foreign_keys = ON');

        if (this.options.synchronize) {
            await this.synchronize();
        }
    }

    /**
     * Synchronizes the database schema with the entity metadata.
     * Creates tables, indices, and keeps them in sync (basic implementation).
     */
    async synchronize(): Promise<void> {
        const storage = getMetadataArgsStorage();
        for (const table of storage.tables) {
            const columns = storage.findColumns(table.target);
            const sql = SqlGenerator.createTable(table, columns);
            await this.query(sql);

            const indices = storage.findIndices(table.target);
            for (const index of indices) {
                const indexSql = SqlGenerator.createIndex(table, index);
                await this.query(indexSql);
            }

            const relations = storage.findRelations(table.target);
            for (const relation of relations) {
                if (relation.relationType === RelationType.ManyToMany) {
                    const hasJoinTable = storage.joinTables.find(jt => jt.target === table.target && jt.propertyName === relation.propertyName);

                    if (hasJoinTable) {
                        let relatedClass: any = relation.type;
                        try {
                            if (typeof relatedClass === 'function' && !relatedClass.prototype) {
                                relatedClass = (relatedClass as Function)();
                            }
                        } catch (e) { }
                        const relatedTable = storage.findTable(relatedClass);
                        if (relatedTable) {
                            const sql = SqlGenerator.createJunctionTable(table, relation, relatedTable);
                            await this.query(sql);
                        }
                    }
                }
            }
        }
    }

    /**
     * Starts a new database transaction.
     */
    async startTransaction(): Promise<void> {
        await this.query('BEGIN TRANSACTION');
    }

    /**
     * Commits the current database transaction.
     */
    async commitTransaction(): Promise<void> {
        await this.query('COMMIT');
    }

    /**
     * Rolls back the current database transaction.
     */
    async rollbackTransaction(): Promise<void> {
        await this.query('ROLLBACK');
    }

    /**
     * Executes the given callback within a transaction.
     * Automatically commits if successful, or rolls back if an error occurs.
     * @param runInTransaction - Callback to run.
     */
    async transaction<T>(runInTransaction: (entityManager: DataSource) => Promise<T>): Promise<T> {
        await this.startTransaction();
        try {
            const result = await runInTransaction(this);
            await this.commitTransaction();
            return result;
        } catch (err) {
            await this.rollbackTransaction();
            throw err;
        }
    }

    /**
     * Executes a raw SQL query.
     * @param query - The SQL query string.
     * @param params - Parameters for the query.
     */
    async query(query: string, params: any[] = []): Promise<any> {
        return this.driver.executeSql(query, params);
    }

    /**
     * Saves a given entity.
     * If the entity has an ID, it updates it. Otherwise, it inserts it.
     * Handles cascades and relationship persistence if configured.
     * @param entity - The entity instance to save.
     */
    async save(entity: any): Promise<any> {
        const storage = getMetadataArgsStorage();
        const target = entity.constructor;
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const pkColumn = storage.findColumns(target).find(c => c.options.primary);
        const pkName = pkColumn?.propertyName;
        const isUpdate = pkName && (entity as any)[pkName];

        const relations = storage.findRelations(target);
        for (const relation of relations) {
            if (relation.options?.cascade === true || (Array.isArray(relation.options?.cascade) && relation.options?.cascade.includes(isUpdate ? 'update' : 'insert'))) {
                if (relation.relationType === RelationType.ManyToOne || (relation.relationType === RelationType.OneToOne && relation.joinColumn)) {
                    const relatedEntity = (entity as any)[relation.propertyName];
                    if (relatedEntity) {
                        await this.save(relatedEntity);
                    }
                }
            }
        }

        if (isUpdate) {
            const listeners = storage.findListeners(target, ListenerType.BeforeUpdate);
            for (const listener of listeners) {
                if (typeof (entity as any)[listener.propertyName] === 'function') {
                    await (entity as any)[listener.propertyName]();
                }
            }
        } else {
            const listeners = storage.findListeners(target, ListenerType.BeforeInsert);
            for (const listener of listeners) {
                if (typeof (entity as any)[listener.propertyName] === 'function') {
                    await (entity as any)[listener.propertyName]();
                }
            }
        }

        const columns = storage.findColumns(target);
        for (const col of columns) {
            if (col.mode === 'createDate' && !isUpdate && !(entity as any)[col.propertyName]) {
                (entity as any)[col.propertyName] = new Date();
            }
            if (col.mode === 'updateDate') {
                (entity as any)[col.propertyName] = new Date();
            }
            if (col.mode === 'version' && !isUpdate) {
                (entity as any)[col.propertyName] = 1;
            } else if (col.mode === 'version' && isUpdate) {
                (entity as any)[col.propertyName] = ((entity as any)[col.propertyName] || 0) + 1;
            }
        }

        const entityToPersist: any = {};

        for (const col of columns) {
            let val = (entity as any)[col.propertyName];

            if (col.options.type === ColumnType.SimpleArray && Array.isArray(val)) {
                val = val.join(',');
            } else if (col.options.type === ColumnType.SimpleJson && val !== undefined) {
                val = JSON.stringify(val);
            } else if (col.options.type === ColumnType.Date && val instanceof Date) {
                val = val.toISOString();
            }

            if (col.options.transformer) {
                if (val !== undefined) {
                    entityToPersist[col.propertyName] = col.options.transformer.to(val);
                }
            } else {
                if (val !== undefined) entityToPersist[col.propertyName] = val;
            }
        }

        const relationsToPersist = storage.findRelations(target);
        for (const relation of relationsToPersist) {
            if (relation.relationType === RelationType.ManyToOne || (relation.relationType === RelationType.OneToOne && relation.joinColumn)) {
                const relatedEntity = (entity as any)[relation.propertyName];
                if (relatedEntity) {
                    const fkName = relation.joinColumnName || `${relation.propertyName}Id`;
                    entityToPersist[fkName] = relatedEntity.id;
                }
            }
        }

        let res: any;
        if (isUpdate) {
            const criteria: any = {};
            if (pkName) criteria[pkName] = (entity as any)[pkName];

            const { query, params } = SqlGenerator.update(table, entityToPersist, criteria);
            res = await this.query(query, params);
        } else {
            const allColumns = [...columns];

            const relations = storage.findRelations(target);
            for (const relation of relations) {
                if (relation.relationType === RelationType.ManyToOne || (relation.relationType === RelationType.OneToOne && relation.joinColumn)) {
                    const fkName = relation.joinColumnName || `${relation.propertyName}Id`;
                    if (entityToPersist[fkName] !== undefined) {
                        
                        allColumns.push({
                            target: target,
                            propertyName: fkName,
                            options: { name: fkName }
                        } as any);
                    }
                }
            }

            const { query, params } = SqlGenerator.insert(table, allColumns, entityToPersist);
            res = await this.query(query, params);

            if (res.insertId && pkName) {
                (entity as any)[pkName] = res.insertId;
            }
        }

        if (isUpdate) {
            const listeners = storage.findListeners(target, ListenerType.AfterUpdate);
            for (const listener of listeners) {
                if (typeof (entity as any)[listener.propertyName] === 'function') {
                    await (entity as any)[listener.propertyName]();
                }
            }
        } else {
            const listeners = storage.findListeners(target, ListenerType.AfterInsert);
            for (const listener of listeners) {
                if (typeof (entity as any)[listener.propertyName] === 'function') {
                    await (entity as any)[listener.propertyName]();
                }
            }
        }


        const relationsForAll = storage.findRelations(target);
        for (const relation of relationsForAll) {
            if (relation.options?.cascade === true || (Array.isArray(relation.options?.cascade) && relation.options?.cascade.includes(isUpdate ? 'update' : 'insert'))) {

                if (relation.relationType === RelationType.OneToMany) {
                    const children = (entity as any)[relation.propertyName];
                    if (Array.isArray(children)) {
                        for (const child of children) {
                            if (relation.inverseSide) {
                                let inversePropName: string = '';
                                if (typeof relation.inverseSide === 'string') {
                                    inversePropName = relation.inverseSide;
                                } else if (typeof relation.inverseSide === 'function') {
                                    try {
                                        const dummy = new Proxy({}, { get: (_, prop) => prop });
                                        inversePropName = relation.inverseSide(dummy) as any;
                                    } catch (e) { }
                                }
                                if (inversePropName) {
                                    child[inversePropName] = entity;
                                    await this.save(child);
                                }
                            }
                        }
                    }
                }
                else if (relation.relationType === RelationType.OneToOne && !relation.joinColumn) {
                    const child = (entity as any)[relation.propertyName];
                    if (child) {
                        if (relation.inverseSide) {
                            let inversePropName: string = '';
                            if (typeof relation.inverseSide === 'string') {
                                inversePropName = relation.inverseSide;
                            } else if (typeof relation.inverseSide === 'function') {
                                try {
                                    const dummy = new Proxy({}, { get: (_, prop) => prop });
                                    inversePropName = relation.inverseSide(dummy) as any;
                                } catch (e) { }
                            }
                            if (inversePropName) {
                                child[inversePropName] = entity;
                                await this.save(child);
                            }
                        }
                    }
                }
            }
        }


        for (const relation of relations) {
            if (relation.relationType === RelationType.ManyToMany) {
                const relatedItems = (entity as any)[relation.propertyName];

                if ((relation.options?.cascade === true || (Array.isArray(relation.options?.cascade) && relation.options?.cascade.includes(isUpdate ? 'update' : 'insert'))) && Array.isArray(relatedItems)) {
                    for (const item of relatedItems) {
                        await this.save(item);
                    }
                }

                if (Array.isArray(relatedItems) && relatedItems.length > 0) {
                    let relatedClass: any = relation.type;
                    try {
                        if (typeof relatedClass === 'function' && !relatedClass.prototype) {
                            relatedClass = (relatedClass as Function)();
                        }
                    } catch (e) { }

                    const relatedTable = storage.findTable(relatedClass);
                    if (relatedTable) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const junctionTableSQL = SqlGenerator.createJunctionTable(table, relation, relatedTable);

                        const junctionTableName = relation.joinTableName || `${table.tableName}_${relatedTable.tableName}`;

                        for (const item of relatedItems) {
                            const relatedId = item.id;
                            const ownerId = (entity as any)[pkName || 'id'];

                            if (relatedId && ownerId) {
                                const { query, params } = SqlGenerator.insertJunction(junctionTableName, ownerId, relatedId);
                                try {
                                    await this.query(query, params);
                                } catch (e) {

                                }
                            }
                        }
                    }
                }
            }
        }

        return entity;
    }

    /**
     * Updates entities that match the criteria with the given partial entity data.
     * @param target - The entity class.
     * @param criteria - Criteria to find entities to update.
     * @param partialEntity - Partial entity data to apply.
     */
    /**
     * Updates entities that match the criteria with the given partial entity data.
     * @param target - The entity class.
     * @param criteria - Criteria to find entities to update.
     * @param partialEntity - Partial entity data to apply.
     */
    async update<T>(target: Function, criteria: FindOptionsWhere<T> | number | Date | string[] | number[] | Date[], partialEntity: QueryDeepPartialEntity<T>): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const columns = storage.findColumns(target);
        for (const col of columns) {
            if (col.mode === 'updateDate') {
                (partialEntity as any)[col.propertyName] = new Date();
            }
        }

        const entityToPersist: any = { ...partialEntity };
        for (const col of columns) {
            if (col.options.transformer && (partialEntity as any)[col.propertyName] !== undefined) {
                entityToPersist[col.propertyName] = col.options.transformer.to((partialEntity as any)[col.propertyName]);
            }
        }

        const { query, params } = SqlGenerator.update(table, entityToPersist, criteria);
        await this.query(query, params);
    }

    /**
     * Deletes entities that match the criteria.
     * If the entity has a @DeleteDateColumn, it performs a soft delete.
     * @param target - The entity class.
     * @param criteria - Criteria to find entities to delete.
     */
    /**
     * Deletes entities that match the criteria.
     * If the entity has a @DeleteDateColumn, it performs a soft delete.
     * @param target - The entity class.
     * @param criteria - Criteria to find entities to delete.
     */
    async delete<T>(target: Function, criteria: FindOptionsWhere<T> | number | Date | string[] | number[] | Date[]): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const columns = storage.findColumns(target);
        const deleteDateColumn = columns.find(c => c.mode === 'deleteDate');

        if (deleteDateColumn) {
            const updateSet: any = {};
            updateSet[deleteDateColumn.propertyName] = new Date();
            if (deleteDateColumn.options.transformer) {
                updateSet[deleteDateColumn.propertyName] = deleteDateColumn.options.transformer.to(updateSet[deleteDateColumn.propertyName]);
            }

            const { query, params } = SqlGenerator.update(table, updateSet, criteria);
            await this.query(query, params);
        } else {
            const { query, params } = SqlGenerator.delete(table, criteria);
            await this.query(query, params);
        }
    }

    /**
     * Soft-removes the given entity (sets deletedAt column).
     */
    async softRemove<T>(target: Function, criteria: FindOptionsWhere<T> | number | Date | string[] | number[] | Date[]): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        let where: any = criteria;
        if (typeof criteria === 'number' || criteria instanceof Date) {
            where = { id: criteria };
        } else if (Array.isArray(criteria)) {
            where = { id: { operator: 'IN', value: criteria } };
        }

        const { query, params } = SqlGenerator.softRemove(table, where);
       
        params.unshift(Date.now());
        await this.query(query, params);
    }

    /**
     * Recovers a soft-removed entity.
     */
    async recover<T>(target: Function, criteria: FindOptionsWhere<T> | number | Date | string[] | number[] | Date[]): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        let where: any = criteria;
        if (typeof criteria === 'number' || criteria instanceof Date) {
            where = { id: criteria };
        } else if (Array.isArray(criteria)) {
            where = { id: { operator: 'IN', value: criteria } };
        }

        const { query, params } = SqlGenerator.recover(table, where);
        await this.query(query, params);
    }

    /**
     * Removes a specific entity from the database.
     * Unlike delete, this method takes an entity instance and triggers Remove listeners.
     * @param entity - The entity instance to remove.
     */
    async remove(entity: any): Promise<any> {
        const storage = getMetadataArgsStorage();
        const target = entity.constructor;
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const pkColumn = storage.findColumns(target).find(c => c.options.primary);
        const pkName = pkColumn?.propertyName;
        if (!pkName || !entity[pkName]) throw new Error("Cannot remove entity without primary key");

        const beforeListeners = storage.findListeners(target, ListenerType.BeforeRemove);
        for (const listener of beforeListeners) {
            if (typeof entity[listener.propertyName] === 'function') {
                await entity[listener.propertyName]();
            }
        }

        const criteria = { [pkName]: entity[pkName] };
        await this.delete(target, criteria);

        const afterListeners = storage.findListeners(target, ListenerType.AfterRemove);
        for (const listener of afterListeners) {
            if (typeof entity[listener.propertyName] === 'function') {
                await entity[listener.propertyName]();
            }
        }

        return entity;
    }

    /**
     * Inserts a new entity or updates it if a conflict occurs on the specified paths (columns).
     * @param target - The entity class.
     * @param entityOrEntities - The entity or entities to upsert.
     * @param conflictPaths - The columns to check for conflicts (e.g. ['id'] or ['email']).
     */
    async upsert(target: Function, entityOrEntities: any, conflictPaths: string[]): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");
        const columns = storage.findColumns(target);

        const { query, params } = SqlGenerator.upsert(table, columns, entityOrEntities, conflictPaths);
        await this.query(query, params);
    }

    /**
     * Inserts a new entity or array of entities.
     */
    async insert<T>(target: Function, entityOrEntities: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[]): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");
        const columns = storage.findColumns(target);

        const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];

        for (const entity of entities) {

            const entityToPersist: any = {};
            for (const col of columns) {
                
                // @ts-ignore
                let val = entity[col.propertyName];
                if (col.mode === 'createDate' || col.mode === 'updateDate') val = new Date();

                if (col.options.type === ColumnType.SimpleArray && Array.isArray(val)) {
                    val = val.join(',');
                } else if (col.options.type === ColumnType.SimpleJson && val !== undefined) {
                    val = JSON.stringify(val);
                } else if (col.options.type === ColumnType.Date && val instanceof Date) {
                    val = val.toISOString();
                }

                if (col.options.transformer && val !== undefined) {
                    entityToPersist[col.propertyName] = col.options.transformer.to(val);
                } else {
                    if (val !== undefined) entityToPersist[col.propertyName] = val;
                }
            }

            const { query, params } = SqlGenerator.insert(table, columns, entityToPersist);
            await this.query(query, params);
        }
    }

    /**
     * Counts the number of entities that match the criteria.
     * @param target - The entity class.
     * @param where - Optional criteria.
     */
    async count<T>(target: Function, where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<number> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const { query, params } = SqlGenerator.count(table, where);
        const result = await this.query(query, params);
        return result[0].count;
    }

    /**
     * Finds entities that match the given options.
     * @param target - The entity class.
     * @param options - Find options (where, relations) or simple where object.
     */
    async find<T>(target: Function, options?: FindManyOptions<T>): Promise<T[]> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        let where: any;
        let relations: string[] = [];
        let take: number | undefined;
        let skip: number | undefined;
        let order: any;
        let select: string[] | undefined;
        let withDeleted: boolean = false;

        if (options) {
            where = options.where;
            relations = (options.relations as string[]) || [];
            take = options.take;
            skip = options.skip;
            order = options.order;
            select = options.select as string[];
            withDeleted = options.withDeleted || false;
        }

        const { query, params } = SqlGenerator.select(table, where, relations, order, take, skip, select, withDeleted);
        const results = await this.query(query, params);

        return this.mapResults(target, results, relations);
    }

    /**
     * Finds entities that match the given options and returns them with the count.
     */
    async findAndCount<T>(target: Function, options?: FindManyOptions<T>): Promise<[T[], number]> {
        const [items, count] = await Promise.all([
            this.find<T>(target, options),
            this.count<T>(target, options?.where)
        ]);
        return [items, count];
    }

    /**
     * Finds the first entity that matches the given options.
     * @param target - The entity class.
     * @param options - Find options.
     */
    async findOne<T>(target: Function, options: FindOneOptions<T>): Promise<T | undefined> {
        return (await this.find<T>(target, options as FindManyOptions<T>))[0];
    }

    /**
     * Maps raw database results to entity instances, applying transformers and listeners.
     * @param target - The entity class.
     * @param results - Raw results from the driver.
     */
    public mapResults(target: any, results: any[], relations: string[] = []): any[] {
        if (!Array.isArray(results) || results.length === 0) return [];

        const storage = getMetadataArgsStorage();
        const columns = storage.findColumns(target);
        const listeners = storage.findListeners(target, ListenerType.AfterLoad);
        const entityMap = new Map<any, any>();
        const pkColumn = columns.find(c => c.options.primary) || columns[0];
        const pkName = pkColumn.options.name || pkColumn.propertyName;

        results.forEach(row => {
            const pkValue = row[pkName];

            if (pkValue === undefined || pkValue === null) return;

            let entity = entityMap.get(pkValue);

            if (!entity) {
                entity = new target();
        
                for (const col of columns) {
                    const colName = col.options.name || col.propertyName;
                    let val = row[colName];
                    if (val !== undefined) {
                        entity[col.propertyName] = this.transformValue(col, val);
                    }
                }

              
                for (const relationName of relations) {
                    const relation = storage.findRelations(target).find(r => r.propertyName === relationName);
                    if (relation) {
                        if (relation.relationType === RelationType.OneToMany || relation.relationType === RelationType.ManyToMany) {
                            entity[relationName] = [];
                        } else {
                            entity[relationName] = null;
                        }
                    }
                }

                entityMap.set(pkValue, entity);
            }

            for (const relationName of relations) {
                const relation = storage.findRelations(target).find(r => r.propertyName === relationName);
                if (relation) {

                    let relatedClass: any = relation.type;
                    try {
                        if (typeof relatedClass === 'function' && !relatedClass.prototype) {
                            relatedClass = (relatedClass as Function)();
                        }
                    } catch (e) { }

                    const relatedColumns = storage.findColumns(relatedClass);
                    const relatedPkCol = relatedColumns.find(c => c.options.primary) || relatedColumns[0];
                    const relatedPkName = relatedPkCol.options.name || relatedPkCol.propertyName;
                    const relatedPkAlias = `${relationName}_${relatedPkName}`;

                    const relatedPkValue = row[relatedPkAlias];

                    if (relatedPkValue !== undefined && relatedPkValue !== null) {

                        const relatedEntity = new relatedClass();
                        for (const col of relatedColumns) {
                            const colName = col.options.name || col.propertyName;
                            const alias = `${relationName}_${colName}`;
                            let val = row[alias];
                            if (val !== undefined) {
                                relatedEntity[col.propertyName] = this.transformValue(col, val);
                            }
                        }

                        if (relation.relationType === RelationType.OneToMany || relation.relationType === RelationType.ManyToMany) {

                            const existing = entity[relationName].find((e: any) => e[relatedPkCol.propertyName] === relatedPkValue);
                            if (!existing) {
                                entity[relationName].push(relatedEntity);
                            }
                        } else {
                            entity[relationName] = relatedEntity;
                        }
                    }
                }
            }
        });

        return Array.from(entityMap.values()).map(entity => {
            for (const listener of listeners) {
                if (typeof entity[listener.propertyName] === 'function') {
                    entity[listener.propertyName]();
                }
            }
            return entity;
        });
    }

    /**
     * Clears all data from the entity's table.
     */
    async clear(target: Function): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const sql = SqlGenerator.clear(table);
        await this.query(sql);
    }

    /**
     * Increments a column value atomically.
     */
    async increment<T>(target: Function, conditions: FindOptionsWhere<T>, propertyPath: string, value: number): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const { query, params } = SqlGenerator.updateCounter(table, conditions, propertyPath, value, 'increment');
        await this.query(query, params);
    }

    /**
     * Decrements a column value atomically.
     */
    async decrement<T>(target: Function, conditions: FindOptionsWhere<T>, propertyPath: string, value: number): Promise<void> {
        const storage = getMetadataArgsStorage();
        const table = storage.findTable(target);
        if (!table) throw new Error("Entity not found in metadata");

        const { query, params } = SqlGenerator.updateCounter(table, conditions, propertyPath, value, 'decrement');
        await this.query(query, params);
    }

    private transformValue(col: any, val: any): any {
        if (col.options.transformer) {
            return col.options.transformer.from(val);
        } else if (col.options.type === ColumnType.SimpleArray && typeof val === 'string') {
            return val === '' ? [] : val.split(',');
        } else if (col.options.type === ColumnType.SimpleJson && typeof val === 'string') {
            try {
                return JSON.parse(val);
            } catch (e) { return val; }
        } else if (col.options.type === ColumnType.Date && typeof val === 'string') {
            return new Date(val);
        }
        return val;
    }
}
