import { DataSource } from './data-source';
import { FindManyOptions, FindOneOptions, FindOptionsWhere, QueryDeepPartialEntity } from './types';

/**
 * Base abstract class for Active Record pattern.
 */
export class BaseEntity {
    /**
     * Finds entities matching method options.
     */
    static async find<T extends BaseEntity>(this: { new(): T }, options?: FindManyOptions<T>): Promise<T[]> {
        return DataSource.getManager().find<T>(this, options);
    }

    /**
     * Finds first entity matching the options.
     */
    static async findOne<T extends BaseEntity>(this: { new(): T }, options: FindOneOptions<T>): Promise<T | undefined> {
        return DataSource.getManager().findOne<T>(this, options);
    }

    /**
     * Deletes entities matching the criteria.
     */
    /**
     * Deletes entities matching the criteria.
     */
    static async delete<T extends BaseEntity>(this: { new(): T }, criteria: FindOptionsWhere<T> | number | Date | string[] | number[] | Date[]): Promise<void> {
        return DataSource.getManager().delete<T>(this, criteria);
    }

    /**
     * Soft-deletes entities matching the criteria.
     */
    static async softDelete<T extends BaseEntity>(this: { new(): T }, criteria: FindOptionsWhere<T> | number | Date): Promise<void> {
        return DataSource.getManager().softRemove<T>(this, criteria);
    }

    /**
     * Restores soft-deleted entities matching the criteria.
     */
    static async restore<T extends BaseEntity>(this: { new(): T }, criteria: FindOptionsWhere<T> | number | Date): Promise<void> {
        return DataSource.getManager().recover<T>(this, criteria);
    }

    /**
     * Updates entities matching the criteria with partial data.
     */
    /**
     * Updates entities matching the criteria with partial data.
     */
    static async update<T extends BaseEntity>(this: { new(): T }, criteria: FindOptionsWhere<T> | number | Date, partialEntity: QueryDeepPartialEntity<T>): Promise<void> {
        return DataSource.getManager().update<T>(this, criteria, partialEntity);
    }

    /**
     * Upserts (insert or update) entities.
     */
    static async upsert<T extends BaseEntity>(this: { new(): T }, entity: Partial<T>, conflictPaths: string[]): Promise<void> {
        return DataSource.getManager().upsert(this, entity, conflictPaths);
    }

    /**
     * Counts entities matching range criteria.
     */
    static async count<T extends BaseEntity>(this: { new(): T }, where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<number> {
        return DataSource.getManager().count<T>(this, where);
    }

    /**
     * Finds entities and returns them with the count.
     */
    static async findAndCount<T extends BaseEntity>(this: { new(): T }, options?: FindManyOptions<T>): Promise<[T[], number]> {
        return DataSource.getManager().findAndCount<T>(this, options);
    }

    /**
     * Finds first entity matching the simple where conditions.
     */
    static async findOneBy<T extends BaseEntity>(this: { new(): T }, where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T | undefined> {
        return DataSource.getManager().findOne<T>(this, { where });
    }

    /**
     * Save the current entity instance.
     */
    async save(): Promise<this> {
        return DataSource.getManager().save(this);
    }

    /**
     * Removes the current entity instance.
     */
    /**
     * Removes the current entity instance.
     */
    async remove(): Promise<this> {
        return DataSource.getManager().remove(this);
    }

    /**
     * Soft-removes the current entity instance.
     */
    async softRemove(): Promise<this> {
        // @ts-ignore
        if (this.id) {
            // @ts-ignore
            await DataSource.getManager().softRemove(this.constructor, this.id);
        }
        return this;
    }

    /**
     * Recovers the current entity instance.
     */
    async recover(): Promise<this> {
        // @ts-ignore
        if (this.id) {
            // @ts-ignore
            await DataSource.getManager().recover(this.constructor, this.id);
        }
        return this;
    }

    /**
     * Reloads the entity from the database.
     */
    async reload(): Promise<void> {
        // @ts-ignore
        if (this.id) {
            // @ts-ignore
            const entity = await DataSource.getManager().findOne(this.constructor, { where: { id: this.id } });
            if (entity) {
                Object.assign(this, entity);
            }
        }
    }

    /**
     * Checks if the entity has an id.
     */
    hasId(): boolean {
        // @ts-ignore
        return !!this.id;
    }

    /**
     * Increments some column by provided value of the entities matching given conditions.
     */
    static async increment<T extends BaseEntity>(this: { new(): T }, conditions: FindOptionsWhere<T>, propertyPath: string, value: number): Promise<void> {
        return DataSource.getManager().increment<T>(this, conditions, propertyPath, value);
    }

    /**
     * Decrements some column by provided value of the entities matching given conditions.
     */
    static async decrement<T extends BaseEntity>(this: { new(): T }, conditions: FindOptionsWhere<T>, propertyPath: string, value: number): Promise<void> {
        return DataSource.getManager().decrement<T>(this, conditions, propertyPath, value);
    }

    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     */
    static async clear<T extends BaseEntity>(this: { new(): T }): Promise<void> {
        return DataSource.getManager().clear(this);
    }

    /**
     * Creates a new entity instance(s) from a plain object.
     * Does not save it to the database.
     */
    static create<T extends BaseEntity>(this: { new(): T }): T;
    static create<T extends BaseEntity>(this: { new(): T }, entityLike: QueryDeepPartialEntity<T>): T;
    static create<T extends BaseEntity>(this: { new(): T }, entityLikeArray: QueryDeepPartialEntity<T>[]): T[];
    static create<T extends BaseEntity>(this: { new(): T }, entityLikeOrArray?: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[]): T | T[] {
        if (Array.isArray(entityLikeOrArray)) {
            return entityLikeOrArray.map(e => {
                const entity = new this();
                Object.assign(entity, e);
                return entity;
            });
        }
        const entity = new this();
        if (entityLikeOrArray) {
            Object.assign(entity, entityLikeOrArray);
        }
        return entity;
    }

    /**
     * Merges multiple entities/objects into a single entity.
     */
    static merge<T extends BaseEntity>(this: { new(): T }, mergeIntoEntity: T, ...entityLikes: QueryDeepPartialEntity<T>[]): T {
        for (const entityLike of entityLikes) {
            Object.assign(mergeIntoEntity, entityLike);
        }
        return mergeIntoEntity;
    }

    /**
     * Inserts a new entity without checking it exists.
     * Efficient for bulk inserts.
     */
    static async insert<T extends BaseEntity>(this: { new(): T }, entity: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[]): Promise<void> {
        return DataSource.getManager().insert<T>(this, entity);
    }
}
