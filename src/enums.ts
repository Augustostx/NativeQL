/**
 * Supported column types for the database.
 */
export enum ColumnType {
    String = 'string',
    Number = 'number',
    Boolean = 'boolean',
    Integer = 'integer',
    SimpleArray = 'simple-array',
    SimpleJson = 'simple-json',
    Text = 'text',
    DateTime = 'datetime',
    Date = 'date'
}

/**
 * Supported relation types between entities.
 */
export enum RelationType {
    OneToOne = 'one-to-one',
    OneToMany = 'one-to-many',
    ManyToOne = 'many-to-one',
    ManyToMany = 'many-to-many'
}

/**
 * Lifecycle event types for entity listeners.
 */
export enum ListenerType {
    BeforeInsert = 'JOB_BEFORE_INSERT',
    AfterInsert = 'JOB_AFTER_INSERT',
    BeforeUpdate = 'JOB_BEFORE_UPDATE',
    AfterUpdate = 'JOB_AFTER_UPDATE',
    BeforeRemove = 'JOB_BEFORE_REMOVE',
    AfterRemove = 'JOB_AFTER_REMOVE',
    AfterLoad = 'JOB_AFTER_LOAD'
}

/**
 * Filter operators for query conditions.
 */
export enum OperatorType {
    Equal = 'EQUAL',
    NotEqual = 'NOT',
    LessThan = 'LT',
    GreaterThan = 'GT',
    LessThanOrEqual = 'LTE',
    GreaterThanOrEqual = 'GTE',
    Between = 'BETWEEN',
    Like = 'LIKE',
    ILike = 'ILIKE',
    In = 'IN',
    IsNull = 'IS_NULL',
    Raw = 'RAW',
    Not = 'NOT'
}
