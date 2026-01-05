<a href="https://github.com/Bes-js/nativeql" align="center">
  <img src="./assets/package_logo.png">
</a>

A lightweight, powerful, and TypeORM-aligned Object-Relational Mapper (ORM) for React Native applications. Built for SQLite, optimized for developer experience.

Designed to work seamlessly with `expo-sqlite` (both classic and "next") and `react-native-sqlite-storage`.

## Features ✨

- **TypeORM Alignment**: Familiar API (`find`, `findOne`, `save`, `softDelete`, `create`, `merge`, etc.).
- **Strict Typing**: No more magic strings. Queries are strictly typed to your entities.
- **Active Record & Data Mapper**: Work directly with entities (`User.find()`) or via repositories.
- **CLI Tools**: Built-in CLI for entity generation, migrations, and schema diagrams.
- **Soft Deletes**: `@DeleteDateColumn()` support for automatic soft deletion and recovery.
- **Relations**: Easy-to-use decorators for OneToOne, OneToMany, ManyToOne, ManyToMany.
- **Cross-Platform**: Works with Expo and generic React Native projects.
- **Lifecycle Hooks**: `BeforeInsert`, `AfterLoad`, etc.
- **Transactions**: Full ACID compliance.

---

## Installation 📦

1. **Install core package:**

   ```bash
   npm install nativeql reflect-metadata
   ```

2. **Install a Driver:**

   **Generic React Native:**

   ```bash
   npm install react-native-sqlite-storage
   ```

   **Expo:**

   ```bash
   npx expo install expo-sqlite
   ```

3. **Configure TypeScript (`tsconfig.json`):**

   ```json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true
     }
   }
   ```

4. **Import Reflection:**
   Add this to the very top of `App.tsx`:

   ```typescript
   import "reflect-metadata";
   ```

5. **Configure Babel (`babel.config.js`):**

   Install necessary plugins:

   ```bash
   npm install --save-dev babel-plugin-transform-typescript-metadata @babel/plugin-proposal-decorators @babel/plugin-proposal-class-properties
   ```

   Update `babel.config.js`:

   ```javascript
   module.exports = function (api) {
     api.cache(true);
     return {
       presets: ["babel-preset-expo"], // or 'module:metro-react-native-babel-preset'
       plugins: [
         "babel-plugin-transform-typescript-metadata",
         ["@babel/plugin-proposal-decorators", { legacy: true }],
         ["@babel/plugin-proposal-class-properties", { loose: true }],
       ],
     };
   };
   ```

---

## Quick Start 🏁

### 1. Create an Entity

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ColumnType,
} from "nativeql";

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  declare id: number;

  @Column({ type: ColumnType.String })
  declare name: string;

  @Column({ type: "text", nullable: true })
  declare email?: string;

  @Column({ type: "boolean", default: true })
  declare isActive: boolean;

  // Automatic soft-delete support
  @DeleteDateColumn()
  declare deletedAt?: Date;

  @CreateDateColumn()
  declare createdAt: Date;

  @UpdateDateColumn()
  declare updatedAt: Date;
}
```

### 2. Initialize DataSource

```typescript
import { DataSource, ExpoSqliteDriver } from "nativeql";
import * as SQLite from "expo-sqlite";

// For Expo SDK 50+ (Next API)
const db = SQLite.openDatabaseSync("mydb.db");

export const AppDataSource = new DataSource({
  driver: new ExpoSqliteDriver(db),
  entities: [User],
  synchronize: true, // Auto-create tables (Dev only)
});

// Initialize on App Start
await AppDataSource.initialize();
```

---

## Data Operations 🛠️

NativeQL enforces **strict typing**. Queries must use object syntax.

### Create & Insert

```typescript
// 1. Create instance (Active Record)
const user = new User();
user.name = "Alice";
await user.save();

// 2. Static Create (No DB call yet)
const newUser = User.create({ name: "Bob", email: "bob@test.com" });
await newUser.save();

// 3. Fast Insert (No cascades/selects)
await User.insert({ name: "Charlie", isActive: false });
```

### Read

```typescript
// Find One (Strict WHERE clause required)
const user = await User.findOne({
  where: { id: 1 },
  relations: ["posts"],
});

// Find Many
const activeUsers = await User.find({
  where: { isActive: true },
  order: { name: "ASC" },
  take: 10,
});

// Find and Count
const [users, count] = await User.findAndCount({ skip: 0, take: 5 });
```

### Update

```typescript
// Partial Update (by ID)
await User.update(1, { name: "New Name" });

// Bulk Update (by Criteria)
await User.update({ isActive: false }, { isActive: true });
```

### Delete & Soft Delete

```typescript
// Soft Delete (requires @DeleteDateColumn)
await User.softDelete(1);
// Row remains in DB with deletedAt set.
// User.find() will implicitly filter these out.

// Restore
await User.restore(1);

// Hard Delete (Permanent)
await User.delete(1);
```

### Utility Methods

```typescript
// Counters
await Post.increment({ id: 1 }, "views", 1);
await Product.decrement({ id: 5 }, "stock", 1);

// Check & Reload
if (user.hasId()) {
  await user.reload(); // Re-fetch from DB
}

// Truncate Table
await User.clear();
```

---

## CLI Tools 🖥️

NativeQL comes with a powerful CLI.

```bash
# Initialize CLI configuration
npx nativeql init

# Generate a new Entity
npx nativeql generate entity User

# Validate Schema (Check for common errors)
npx nativeql validate

# Visualize Schema (Mermaid Diagram)
npx nativeql diagram
```

---

## Relationships 🔗

Support for standard relationship types with `eager` loading and `cascades`.

```typescript
@Entity("posts")
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.posts)
  user!: User;

  @ManyToMany(() => Category)
  @JoinTable()
  categories!: Category[];
}
```

---

## Advanced Querying 🔍

Use operators for complex filters:

```typescript
import { In, Like, LessThan, MoreThan } from "nativeql";

const results = await Product.find({
  where: {
    price: LessThan(50),
    category: In(["Electronics", "Books"]),
    name: Like("%Pro%"),
  },
});
```

---

## License

MIT
