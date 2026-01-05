/**
 * Interface for SQLite Driver Adapter.
 * Adapts specific SQLite libraries (e.g. react-native-quick-sqlite, expo-sqlite) to the ORM.
 */
export interface SqliteDriver {
    /**
     * Executes a raw SQL query with optional parameters.
     */
    executeSql(sql: string, params?: any[]): Promise<any>;
}
