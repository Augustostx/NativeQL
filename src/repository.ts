import { DataSource } from './data-source';
import { EntityMetadata } from './metadata';
import { QueryBuilder } from './query-builder';
import { FindManyOptions, FindOneOptions, FindOptionsWhere, QueryDeepPartialEntity } from './types';

/**
 * Repository pattern implementation.
 * Provides abstraction for entity operations.
 */
export class Repository<Entity> {
    constructor(
        private dataSource: DataSource,
        private target: Function,
        private metadata: EntityMetadata
    ) { }

    /**
     * Creates a new QueryBuilder for this repository's entity.
     * @param alias - Optional alias.
     */
    createQueryBuilder(alias?: string): QueryBuilder<Entity> {
        return this.dataSource.createQueryBuilder(this.target, alias);
    }

    /**
     * Saves the given entity.
     * @param entity - The entity to save.
     */
    async save(entity: Entity): Promise<Entity> {
        return this.dataSource.save(entity);
    }

    /**
     * Finds entities matching the options.
     * @param options - Find options.
     */
    async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
        return this.dataSource.find<Entity>(this.target, options);
    }

    /**
     * Finds one entity matching the options.
     * @param options - Find options.
     */
    async findOne(options: FindOneOptions<Entity>): Promise<Entity | undefined> {
        return this.dataSource.findOne<Entity>(this.target, options);
    }

    /**
     * Deletes entities by criteria.
     * @param criteria - Find criteria.
     */
    async delete(criteria: FindOptionsWhere<Entity> | number | Date | string[] | number[] | Date[]): Promise<void> {
        return this.dataSource.delete<Entity>(this.target, criteria);
    }

    /**
     * Soft-deletes entities by criteria.
     */
    async softDelete(criteria: FindOptionsWhere<Entity> | number | Date): Promise<void> {
        return this.dataSource.softRemove<Entity>(this.target, criteria);
    }

    /**
     * Restores soft-deleted entities.
     */
    async restore(criteria: FindOptionsWhere<Entity> | number | Date): Promise<void> {
        return this.dataSource.recover<Entity>(this.target, criteria);
    }

    /**
     * Removes the given entity.
     * @param entity - The entity to remove.
     */
    async remove(entity: Entity): Promise<Entity> {
        return this.dataSource.remove(entity);
    }

    /**
     * Updates entities by criteria with partial data.
     */
    async update(criteria: FindOptionsWhere<Entity> | number | Date, partialEntity: QueryDeepPartialEntity<Entity>): Promise<void> {
        return this.dataSource.update<Entity>(this.target, criteria, partialEntity);
    }

    /**
     * Upserts (insert or update) entities.
     */
    async upsert(entityOrEntities: any, conflictPaths: string[]): Promise<void> {
        return this.dataSource.upsert(this.target, entityOrEntities, conflictPaths);
    }

    /**
     * Counts entities matching the criteria.
     */
    async count(where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number> {
        return this.dataSource.count<Entity>(this.target, where);
    }

    /**
     * Finds entities and returns them with the count.
     */
    async findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]> {
        const [items, count] = await Promise.all([
            this.find(options),
            this.count(options?.where)
        ]);
        return [items, count];
    }

    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     */
    async clear(): Promise<void> {
        return this.dataSource.clear(this.target);
    }

    /**
     * Increments some column by provided value of the entities matching given conditions.
     */
    async increment(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number): Promise<void> {
        return this.dataSource.increment<Entity>(this.target, conditions, propertyPath, value);
    }

    /**
     * Decrements some column by provided value of the entities matching given conditions.
     */
    async decrement(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number): Promise<void> {
        return this.dataSource.decrement<Entity>(this.target, conditions, propertyPath, value);
    }
}
