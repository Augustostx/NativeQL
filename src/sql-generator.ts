import { EntityMetadata, ColumnMetadata, getMetadataArgsStorage, RelationMetadata } from './metadata';
import { ColumnType, RelationType, OperatorType } from './enums';

/**
 * Generates SQL queries for various database operations.
 */
export class SqlGenerator {

    /**
     * Generates an INSERT query.
     * @param metadata - Entity metadata.
     * @param columns - Columns to insert.
     * @param entity - Entity instance with data.
     */
    static insert(metadata: EntityMetadata, columns: ColumnMetadata[], entity: any): { query: string, params: any[] } {
        const columnNames = columns.map(c => c.options.name || c.propertyName);
        const placeholders = columnNames.map(() => '?').join(', ');
        const values = columns.map(c => entity[c.propertyName]);

        const query = `INSERT INTO ${metadata.tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;
        return { query, params: values };
    }

    /**
     * Generates a SELECT query with joins, ordering, and pagination.
     * @param metadata - Entity metadata.
     * @param where - Where conditions.
     * @param relations - Relations to join and select.
     * @param order - Order by conditions.
     * @param take - Limit number of records.
     * @param skip - Offset.
     * @param select - Specific columns to select.
     * @param withDeleted - Include soft-deleted records.
     */
    static select(metadata: EntityMetadata, where?: any, relations: string[] = [], order?: any, take?: number, skip?: number, select?: string[], withDeleted: boolean = false): { query: string, params: any[] } {
        const storage = getMetadataArgsStorage();

        let selectClause = `${metadata.tableName}.*`;
        if (select && select.length > 0) {
            selectClause = select.map(col => `${metadata.tableName}.${col}`).join(', ');
        }

        let query = `SELECT ${selectClause}`;

        // Handle Relations Selection
        if (relations.length > 0) {
            relations.forEach(relationName => {
                const relation = storage.findRelations(metadata.target).find(r => r.propertyName === relationName);
                if (relation) {
                    let relatedClass: any = relation.type;
                    try {
                        if (typeof relatedClass === 'function' && !relatedClass.prototype) {
                            relatedClass = (relatedClass as Function)();
                        }
                    } catch (e) { }

                    const relatedTableMeta = storage.findTable(relatedClass);
                    if (relatedTableMeta) {
                        const relatedTableName = relatedTableMeta.tableName;
                        const relatedColumns = storage.findColumns(relatedClass);

                        relatedColumns.forEach(col => {
                            const colName = col.options.name || col.propertyName;
                            const alias = `${relationName}_${colName}`;
                            query += `, ${relatedTableName}.${colName} as ${alias}`;
                        });
                    }
                }
            });
        }

        query += ` FROM ${metadata.tableName}`;

        // Handle Joins
        if (relations.length > 0) {
            relations.forEach(relationName => {
                const relation = storage.findRelations(metadata.target).find(r => r.propertyName === relationName);
                if (relation) {
                    let relatedClass: any = relation.type;
                    try {
                        if (typeof relatedClass === 'function' && !relatedClass.prototype) {
                            relatedClass = (relatedClass as Function)();
                        }
                    } catch (e) { }

                    const relatedTableMeta = storage.findTable(relatedClass);
                    const relatedTableName = relatedTableMeta ? relatedTableMeta.tableName : relationName + "Table";

                    if (relation.relationType === RelationType.ManyToMany) {
                        // Many-to-Many Join via Junction Table
                        const joinTableMeta = storage.joinTables.find(jt => jt.target === metadata.target && jt.propertyName === relationName);
                        let junctionTableName = `${metadata.tableName}_${relatedTableName}`;
                        if (joinTableMeta && joinTableMeta.name) junctionTableName = joinTableMeta.name;

                        // Join Junction
                        query += ` LEFT JOIN ${junctionTableName} ON ${junctionTableName}.${metadata.tableName}Id = ${metadata.tableName}.id`;

                        // Join Related
                        query += ` LEFT JOIN ${relatedTableName} ON ${relatedTableName}.id = ${junctionTableName}.${relatedTableName}Id`;

                    } else if (relation.relationType === RelationType.ManyToOne || (relation.relationType === RelationType.OneToOne && relation.joinColumn)) {
                        // ManyToOne OR OneToOne Owner: This table has the FK
                        const fkName = relation.joinColumnName || `${relationName}Id`;
                        query += ` LEFT JOIN ${relatedTableName} ON ${relatedTableName}.id = ${metadata.tableName}.${fkName}`;
                    } else if (relation.relationType === RelationType.OneToMany) {
                        
                        let fkName = "foreignKey";
                        if (relatedTableMeta) {
                            
                            const matchingRelation = storage.findRelations(relatedTableMeta.target).find(r => {
                                let rType: any = r.type;
                                try {
                                    if (typeof rType === 'function' && !rType.prototype) rType = (rType as Function)();
                                } catch (e) { }
                                return rType === metadata.target && r.relationType === RelationType.ManyToOne;
                            });

                            if (matchingRelation) {
                                fkName = matchingRelation.joinColumnName || `${matchingRelation.propertyName}Id`;
                            }
                        }
                        query += ` LEFT JOIN ${relatedTableName} ON ${relatedTableName}.${fkName} = ${metadata.tableName}.id`;
                    } else if (relation.relationType === RelationType.OneToOne && !relation.joinColumn) {
                        // OneToOne Inverse (Non-owner)
                        let fkName = "foreignKey";
                        if (relatedTableMeta) {
                            const matchingRelation = storage.findRelations(relatedTableMeta.target).find(r => {
                                let rType: any = r.type;
                                try {
                                    if (typeof rType === 'function' && !rType.prototype) rType = (rType as Function)();
                                } catch (e) { }
                                return rType === metadata.target && r.relationType === RelationType.OneToOne && r.joinColumn;
                            });
                            if (matchingRelation) {
                                fkName = matchingRelation.joinColumnName || `${matchingRelation.propertyName}Id`;
                            }
                        }
                        query += ` LEFT JOIN ${relatedTableName} ON ${relatedTableName}.${fkName} = ${metadata.tableName}.id`;
                    } else {
                        query += ` LEFT JOIN ${relatedTableName} ON ${relatedTableName}.foreignKey = ${metadata.tableName}.id`;
                    }
                }
            });
        }

        const params: any[] = [];
        let whereClauses: string[] = [];

        // Handle Soft Delete
        if (!withDeleted) {
            const columns = storage.findColumns(metadata.target);
            const deleteDateCol = columns.find(c => c.mode === 'deleteDate');
            if (deleteDateCol) {
                whereClauses.push(`${metadata.tableName}.${deleteDateCol.options.name || deleteDateCol.propertyName} IS NULL`);
            }
        }

        if (where && Object.keys(where).length > 0) {
            const { clause, values } = this.buildConditions(where);
            if (clause) {
                whereClauses.push(clause);
                params.push(...values);
            }
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        if (order) {
            const orderClauses = Object.keys(order).map(key => {
                const dir = order[key];
                const direction = (dir === 'DESC' || dir === 'desc' || dir === -1) ? 'DESC' : 'ASC';
                return `${key} ${direction}`;
            });
            if (orderClauses.length > 0) {
                query += ` ORDER BY ${orderClauses.join(', ')}`;
            }
        }

        if (take !== undefined) {
            query += ` LIMIT ${take}`;
        }

        if (skip !== undefined) {
            query += ` OFFSET ${skip}`;
        }

        return { query, params };
    }

    /**
     * Creates table schema.
     */
    static createJunctionTable(metadata: EntityMetadata, relation: RelationMetadata, relatedMetadata: EntityMetadata): string {
        const junctionTableName = relation.joinTableName || `${metadata.tableName}_${relatedMetadata.tableName}`;
        const col1 = `${metadata.tableName}Id`;
        const col2 = `${relatedMetadata.tableName}Id`;

        return `CREATE TABLE IF NOT EXISTS ${junctionTableName} (
            ${col1} INTEGER, 
            ${col2} INTEGER, 
            PRIMARY KEY(${col1}, ${col2}),
            FOREIGN KEY (${col1}) REFERENCES ${metadata.tableName}(id) ON DELETE CASCADE,
            FOREIGN KEY (${col2}) REFERENCES ${relatedMetadata.tableName}(id) ON DELETE CASCADE
        )`;
    }

    /**
     * Generates a helper query to insert into junction table.
     */
    static insertJunction(junctionTableName: string, val1: any, val2: any): { query: string, params: any[] } {
        const query = `INSERT INTO ${junctionTableName} VALUES (?, ?)`;
        return { query, params: [val1, val2] };
    }

    /**
     * Generates a DELETE query.
     */
    static delete(metadata: EntityMetadata, where: any): { query: string, params: any[] } {
        let query = `DELETE FROM ${metadata.tableName}`;
        const params: any[] = [];

        if (where) {
            const { clause, values } = this.buildConditions(where);
            query += ` WHERE ${clause}`;
            params.push(...values);
        } else {
            throw new Error("DELETE requires a WHERE clause (for safety in this simple ORM)");
        }

        return { query, params };
    }

    /**
     * Generates an UPDATE query.
     */
    static update(metadata: EntityMetadata, values: any, where: any): { query: string, params: any[] } {
        let query = `UPDATE ${metadata.tableName}`;
        const params: any[] = [];

        const setClauses = Object.keys(values).map(key => {
            params.push(values[key]);
            return `${key} = ?`;
        });

        query += ` SET ${setClauses.join(', ')}`;

        if (where) {
            const { clause, values: whereValues } = this.buildConditions(where);
            query += ` WHERE ${clause}`;
            params.push(...whereValues);
        } else {
            throw new Error("UPDATE requires a WHERE clause");
        }

        return { query, params };
    }

    /**
     * Generates an Upsert (Insert or Update) query.
     */
    static upsert(metadata: EntityMetadata, columns: ColumnMetadata[], entity: any, conflictPaths: string[]): { query: string, params: any[] } {
        const columnNames = columns.map(c => c.options.name || c.propertyName);
        const placeholders = columnNames.map(() => '?').join(', ');
        const values = columns.map(c => entity[c.propertyName]);

        let query = `INSERT INTO ${metadata.tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;

        if (conflictPaths.length > 0) {
            query += ` ON CONFLICT(${conflictPaths.join(', ')}) DO UPDATE SET `;
            const updateClauses = columnNames
                .filter(col => !conflictPaths.includes(col)) // Don't update the conflict key itself
                .map(col => `${col}=excluded.${col}`);
            query += updateClauses.join(', ');
        }

        return { query, params: values };
    }

    /**
     * Generates a Count query.
     */
    static count(metadata: EntityMetadata, where?: any): { query: string, params: any[] } {
        let query = `SELECT COUNT(*) as count FROM ${metadata.tableName}`;
        const params: any[] = [];

        if (where) {
            const { clause, values } = this.buildConditions(where);
            query += ` WHERE ${clause}`;
            params.push(...values);
        }

        return { query, params };
    }

    private static buildConditions(where: any): { clause: string, values: any[] } {
        const values: any[] = [];
        const conditions = Object.keys(where).map(key => {
            const value = where[key];
            if (value && typeof value === 'object' && value.operator) {
                switch (value.operator) {
                    case OperatorType.Like:
                        values.push(value.value);
                        return `${key} LIKE ?`;
                    case OperatorType.In:
                        const placeholders = value.value.map(() => '?').join(', ');
                        values.push(...value.value);
                        return `${key} IN (${placeholders})`;
                    case OperatorType.NotEqual:
                        if (typeof value.value === 'object' && value.value.operator) {
                            values.push(value.value);
                            return `${key} != ?`;
                        }
                        values.push(value.value);
                        return `${key} != ?`;
                    case OperatorType.LessThan:
                        values.push(value.value);
                        return `${key} < ?`;
                    case OperatorType.GreaterThan:
                        values.push(value.value);
                        return `${key} > ?`;
                    case OperatorType.LessThanOrEqual:
                        values.push(value.value);
                        return `${key} <= ?`;
                    case OperatorType.GreaterThanOrEqual:
                        values.push(value.value);
                        return `${key} >= ?`;
                    case OperatorType.Between:
                        values.push(value.value[0]);
                        values.push(value.value[1]);
                        return `${key} BETWEEN ? AND ?`;
                    case OperatorType.IsNull:
                        return `${key} IS NULL`;
                    case OperatorType.Equal:
                        values.push(value.value);
                        return `${key} = ?`;
                    case OperatorType.ILike:
                        values.push(value.value);
                        return `${key} LIKE ?`;
                    case OperatorType.Raw:
                        return `${key} ${value.value}`;
                    case OperatorType.Not:
                        if (typeof value.value === 'object' && value.value.operator) {
                            const innerOp = value.value.operator;
                            const innerVal = value.value.value;

                            if (innerOp === OperatorType.In) {
                                const placeholders = innerVal.map(() => '?').join(', ');
                                values.push(...innerVal);
                                return `${key} NOT IN (${placeholders})`;
                            }
                            if (innerOp === OperatorType.Like) {
                                values.push(innerVal);
                                return `${key} NOT LIKE ?`;
                            }
                            if (innerOp === OperatorType.IsNull) {
                                return `${key} IS NOT NULL`;
                            }
                        }
                        values.push(value.value);
                        return `${key} != ?`;
                }
            }
            values.push(value);
            return `${key} = ?`;
        }).join(' AND ');

        return { clause: conditions, values };
    }

    /**
     * Creates a CREATE TABLE query.
     */
    static createTable(metadata: EntityMetadata, columns: ColumnMetadata[]): string {
        const storage = getMetadataArgsStorage();
        let columnDefs = columns.map(col => {
            let def = `${col.options.name || col.propertyName} ${this.getType(col.options.type)}`;
            if (col.options.primary) def += ' PRIMARY KEY';
            if (col.options.generated) def += ' AUTOINCREMENT';
            if (col.options.nullable === false) def += ' NOT NULL';
            return def;
        });

        const relations = storage.findRelations(metadata.target);
        for (const relation of relations) {
            if (relation.relationType === RelationType.ManyToOne || (relation.relationType === RelationType.OneToOne && relation.joinColumn)) {
                const fkName = relation.joinColumnName || `${relation.propertyName}Id`;

                let relatedClass: any = relation.type;
                try {
                    if (typeof relatedClass === 'function' && !relatedClass.prototype) {
                        relatedClass = (relatedClass as Function)();
                    }
                } catch (e) { }
                const relatedTable = storage.findTable(relatedClass);

                if (relatedTable) {
                    columnDefs.push(`${fkName} INTEGER`);

                    let fkClause = `FOREIGN KEY (${fkName}) REFERENCES ${relatedTable.tableName}(id)`;
                    if (relation.options?.onDelete) {
                        fkClause += ` ON DELETE ${relation.options.onDelete}`;
                    }
                    columnDefs.push(fkClause);
                } else {
                    columnDefs.push(`${fkName} INTEGER`);
                }
            }
        }

        return `CREATE TABLE IF NOT EXISTS ${metadata.tableName} (${columnDefs.join(', ')})`;
    }

    /**
     * Creates a CREATE INDEX query.
     */
    static createIndex(metadata: EntityMetadata, index: any): string {
        const columns = index.columns.join(', ');
        const unique = index.unique ? 'UNIQUE ' : '';
        const indexName = index.name || `IDX_${metadata.tableName}_${index.columns.join('_')}`;
        return `CREATE ${unique}INDEX IF NOT EXISTS ${indexName} ON ${metadata.tableName} (${columns})`;
    }

    private static getType(type: ColumnType | string | undefined): string {
        switch (type) {
            case ColumnType.String: return 'TEXT';
            case ColumnType.SimpleArray: return 'TEXT';
            case ColumnType.SimpleJson: return 'TEXT';
            case ColumnType.Text: return 'TEXT';
            case ColumnType.Number: return 'INTEGER';
            case ColumnType.Boolean: return 'INTEGER';
            case ColumnType.Integer: return 'INTEGER';
            case ColumnType.DateTime: return 'INTEGER';
            case ColumnType.Date: return 'TEXT';
            default: return 'TEXT';
        }
    }

    /**
     * Generates a CLEAR (DELETE ALL) query.
     */
    static clear(metadata: EntityMetadata): string {
        return `DELETE FROM ${metadata.tableName}`;
    }

    /**
     * Generates an Increment/Decrement query.
     */
    static updateCounter(metadata: EntityMetadata, where: any, propertyPath: string, value: number, mode: 'increment' | 'decrement'): { query: string, params: any[] } {
        const symbol = mode === 'increment' ? '+' : '-';
        let query = `UPDATE ${metadata.tableName} SET ${propertyPath} = ${propertyPath} ${symbol} ?`;
        const params: any[] = [value];

        if (where) {
            const { clause, values } = this.buildConditions(where);
            query += ` WHERE ${clause}`;
            params.push(...values);
        }

        return { query, params };
    }

    /**
     * Generates a Soft Remove query (sets deletedAt to NOW).
     */
    static softRemove(metadata: EntityMetadata, where: any): { query: string, params: any[] } {
        const storage = getMetadataArgsStorage();
        const columns = storage.findColumns(metadata.target);
        const deleteDateCol = columns.find(c => c.mode === 'deleteDate');

        if (!deleteDateCol) {
            throw new Error(`Entity ${metadata.tableName} does not have a @DeleteDateColumn. Cannot soft remove.`);
        }

        const colName = deleteDateCol.options.name || deleteDateCol.propertyName;
        let query = `UPDATE ${metadata.tableName} SET ${colName} = ?`;

        const params: any[] = [];

        if (where) {
            const { clause, values } = this.buildConditions(where);
            query += ` WHERE ${clause}`;
            params.push(...values);
        } else {
            throw new Error("softRemove requires a WHERE clause");
        }

        return { query, params };
    }

    /**
     * Generates a Recover query (sets deletedAt to NULL).
     */
    static recover(metadata: EntityMetadata, where: any): { query: string, params: any[] } {
        const storage = getMetadataArgsStorage();
        const columns = storage.findColumns(metadata.target);
        const deleteDateCol = columns.find(c => c.mode === 'deleteDate');

        if (!deleteDateCol) {
            throw new Error(`Entity ${metadata.tableName} does not have a @DeleteDateColumn. Cannot recover.`);
        }

        const colName = deleteDateCol.options.name || deleteDateCol.propertyName;
        let query = `UPDATE ${metadata.tableName} SET ${colName} = NULL`;
        const params: any[] = [];

        if (where) {
            const { clause, values } = this.buildConditions(where);
            query += ` WHERE ${clause}`;
            params.push(...values);
        } else {
            throw new Error("recover requires a WHERE clause");
        }

        return { query, params };
    }
}
