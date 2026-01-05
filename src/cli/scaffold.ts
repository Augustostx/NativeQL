export const tsDataSourceExpoTemplate = `import { DataSource } from "nativeql";
import { ExpoSqliteDriver } from "nativeql/drivers";
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabase("nativeql.db");

export const AppDataSource = new DataSource({
  driver: new ExpoSqliteDriver(db),
  entities: [],
  synchronize: true,
});
`;

export const tsDataSourceRNCliTemplate = `import { DataSource } from "nativeql";
import { RNSqliteStorageDriver } from "nativeql/drivers";
import SQLite from "react-native-sqlite-storage";

SQLite.enablePromise(true);
const db = await SQLite.openDatabase({ name: "nativeql.db", location: "default" });

export const AppDataSource = new DataSource({
  driver: new RNSqliteStorageDriver(db),
  entities: [],
  synchronize: true,
});
`;

export const tsEntityTemplate = `import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "nativeql";

@Entity("users")
export class User extends BaseEntity {

  @PrimaryGeneratedColumn()
  declare id: number;

  // @Column({ type: "text" })
  // declare example: string;
  
}
`;

export const tsMigrationTemplate = `import { MigrationInterface, QueryRunner } from "nativeql";

export class \${NAME} implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query("...");
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query("...");
    }
}
`;

export const tsSubscriberTemplate = `import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent, RemoveEvent } from "nativeql";

@EventSubscriber()
export class \${NAME} implements EntitySubscriberInterface<any> {
    
    // listenTo() { return User; }

    beforeInsert(event: InsertEvent<any>) {
        console.log("Before Insert: ", event.entity);
    }
    
    afterInsert(event: InsertEvent<any>) {
        console.log("After Insert: ", event.entity);
    }
}
`;

export const tsRepositoryTemplate = `import { Repository, EntityRepository } from "nativeql";
// import { User } from "../entities/User";

@EntityRepository()
export class \${NAME} extends Repository<any> {
    
    // Example method
    // findByName(firstName: string) {
    //    return this.findOne({ where: { firstName } });
    // }
}
`;

export const tsSeederTemplate = `import { DataSource } from "nativeql";

export class \${NAME} {
    async run(dataSource: DataSource): Promise<void> {
        // const repo = dataSource.getRepository(User);
        // await repo.save({ firstName: "John", lastName: "Doe" });
    }
}
`;
