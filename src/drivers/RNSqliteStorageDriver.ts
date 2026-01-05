import { SqliteDriver } from '../driver';

/**
 * Driver for react-native-sqlite-storage.
 * Expects the database object created via SQLite.openDatabase(...).
 */
export class RNSqliteStorageDriver implements SqliteDriver {
    private database: any;

    constructor(database?: any) {
        if (database) {
            this.database = database;
        } else {
            try {
                const SQLite = require('react-native-sqlite-storage');
                SQLite.enablePromise(true);
            } catch (e) {
                throw new Error("Embedded 'react-native-sqlite-storage' package not found. Please install it using: 'npm install react-native-sqlite-storage'");
            }
            throw new Error("Database instance is required. Please open the database and pass it to the driver.");
        }
    }

    async executeSql(sql: string, params: any[] = []): Promise<any> {
        if (typeof this.database.executeSql === 'function') {
            try {
                const results = await this.database.executeSql(sql, params);
                const resultSet = results[0];

                if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
                    const rows = [];
                    if (resultSet.rows && resultSet.rows.length) {
                        for (let i = 0; i < resultSet.rows.length; i++) {
                            rows.push(resultSet.rows.item(i));
                        }
                    }
                    return rows;
                } else {
                    return {
                        insertId: resultSet.insertId,
                        rowsAffected: resultSet.rowsAffected
                    };
                }
            } catch (e) {
                return new Promise((resolve, reject) => {
                    this.database.executeSql(sql, params, (resultSet: any) => {
                        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
                            const rows = [];
                            if (resultSet.rows && resultSet.rows.length) {
                                for (let i = 0; i < resultSet.rows.length; i++) {
                                    rows.push(resultSet.rows.item(i));
                                }
                            }
                            resolve(rows);
                        } else {
                            resolve({
                                insertId: resultSet.insertId,
                                rowsAffected: resultSet.rowsAffected
                            });
                        }
                    }, (error: any) => {
                        reject(error);
                    });
                });
            }
        }

        throw new Error("Invalid database object passed to RNSqliteStorageDriver");
    }
}
