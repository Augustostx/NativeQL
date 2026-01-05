import { SqliteDriver } from '../driver';

/**
 * Driver for expo-sqlite.
 * Supports both legacy transaction-based API and newer async API if available.
 */
export class ExpoSqliteDriver implements SqliteDriver {
    private database: any;

    constructor(database?: any) {
        if (database) {
            this.database = database;
        } else {
            try {
                const SQLite = require('expo-sqlite');
                this.database = SQLite.openDatabase("default.db");
            } catch (e) {
                throw new Error("Embedded 'expo-sqlite' package not found. Please install it using: 'npm install expo-sqlite' or 'npx expo install expo-sqlite'");
            }
        }
    }

    async executeSql(sql: string, params: any[] = []): Promise<any> {
        if (this.database.runAsync && this.database.getAllAsync) {
            if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
                const results = await this.database.getAllAsync(sql, params);
                return results;
            } else {
                const result = await this.database.runAsync(sql, params);
                return {
                    insertId: result.lastInsertRowId,
                    rowsAffected: result.changes,
                    rows: { _array: [] }
                };
            }
        }

        return new Promise((resolve, reject) => {
            this.database.transaction((tx: any) => {
                tx.executeSql(
                    sql,
                    params,
                    (_: any, resultSet: any) => {
                        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
                            resolve(resultSet.rows._array || []);
                        } else {
                            resolve({
                                insertId: resultSet.insertId,
                                rowsAffected: resultSet.rowsAffected,
                                rows: resultSet.rows
                            });
                        }
                    },
                    (_: any, error: any) => {
                        reject(error);
                        return false;
                    }
                );
            }, (error: any) => {
                reject(error);
            });
        });
    }
}
