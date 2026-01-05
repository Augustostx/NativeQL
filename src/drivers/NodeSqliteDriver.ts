import { SqliteDriver } from '../driver';
import { Database } from 'sqlite3';

/**
 * Driver for Node.js sqlite3.
 */
export class NodeSqliteDriver implements SqliteDriver {
    private database: Database;

    constructor(database?: Database) {
        if (database) {
            this.database = database;
        } else {
            try {
                const sqlite3 = require('sqlite3').verbose();
                this.database = new sqlite3.Database(':memory:');
            } catch (e) {
                throw new Error("Embedded 'sqlite3' package not found. Please install it using: 'npm install sqlite3'");
            }
        }
    }

    async executeSql(sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const sqlTrimmed = sql.trim().toUpperCase();
            if (sqlTrimmed.startsWith('SELECT') || sqlTrimmed.startsWith('PRAGMA')) {
                this.database.all(sql, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                });
            } else {
                this.database.run(sql, params, function (this: any, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            insertId: this.lastID,
                            rowsAffected: this.changes,
                            rows: { _array: [] }
                        });
                    }
                });
            }
        });
    }
}
