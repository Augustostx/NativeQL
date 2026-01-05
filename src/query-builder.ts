import { DataSource } from './data-source';
import { EntityMetadata, getMetadataArgsStorage } from './metadata';
import { SqlGenerator } from './sql-generator';

/**
 * Fluent interface for building SQL queries.
 */
export class QueryBuilder<Entity> {
    private dataSource: DataSource;
    private metadata?: EntityMetadata;
    private alias?: string;
    private whereClauses: any = {};
    private relations: string[] = [];
    private order?: any;
    private skipCount?: number;
    private takeCount?: number;

    constructor(dataSource: DataSource, entityOrTableName?: Function | string, alias?: string) {
        this.dataSource = dataSource;
        this.alias = alias;

        if (typeof entityOrTableName === 'function') {
            const storage = getMetadataArgsStorage();
            const table = storage.findTable(entityOrTableName);
            if (table) {
                this.metadata = table;
            }
        } else if (typeof entityOrTableName === 'string') {

        }
    
    }

    /**
     * Sets the selection clause.
     * @param selection - Selection string.
     */
    select(selection?: string): this {
        return this;
    }

    /**
     * Sets the WHERE clause.
     * @param where - The where criteria.
     */
    where(where: any): this {
        this.whereClauses = where;
        return this;
    }

    /**
     * Adds an AND WHERE clause.
     * @param where - Additional criteria.
     */
    andWhere(where: any): this {
        this.whereClauses = { ...this.whereClauses, ...where };
        return this;
    }

    /**
     * Adds a LEFT JOIN and selects the related data.
     * @param property - Property path (e.g., "user.posts").
     * @param alias - Alias for the joined table.
     */
    leftJoinAndSelect(property: string, alias: string): this {
        const relation = property.split('.')[1] || property;
        this.relations.push(relation);
        return this;
    }

    /**
     * Orders the results.
     * @param sort - Field to sort by.
     * @param order - Direction (ASC or DESC).
     */
    orderBy(sort: string, order: 'ASC' | 'DESC' = 'ASC'): this {
        this.order = { [sort]: order };
        return this;
    }

    /**
     * Skips the first N results (OFFSET).
     * @param skip - Number of records to skip.
     */
    skip(skip: number): this {
        this.skipCount = skip;
        return this;
    }

    /**
     * Takes the first N results (LIMIT).
     * @param take - Maximum number of records to take.
     */
    take(take: number): this {
        this.takeCount = take;
        return this;
    }

    /**
     * Executes the query and returns multiple results.
     */
    async getMany(): Promise<Entity[]> {
        if (!this.metadata) throw new Error("Entity metadata not found for QueryBuilder");

        let { query, params } = SqlGenerator.select(this.metadata, this.whereClauses, this.relations);

        if (this.order) {
            const orderSql = Object.keys(this.order).map(key => `${key} ${this.order[key]}`).join(', ');
            query += ` ORDER BY ${orderSql}`;
        }

        if (this.takeCount !== undefined) {
            query += ` LIMIT ${this.takeCount}`;
        }
        if (this.skipCount !== undefined) {
            query += ` OFFSET ${this.skipCount}`;
        }

        const results = await this.dataSource.query(query, params);

        return this.dataSource.mapResults(this.metadata.target, results, this.relations);
    }

    /**
     * Executes the query and returns the first result.
     */
    async getOne(): Promise<Entity | undefined> {
        const results = await this.getMany();
        return results[0];
    }
}
