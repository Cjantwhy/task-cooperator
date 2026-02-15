require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT) || 5432,
  database: "postgres",
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
});

async function initDB() {
  try {
    console.log("正在连接到 PostgreSQL...");
    const client = await pool.connect();

    const taskDatabase = process.env.PG_DATABASE || "task_board";
    console.log(`正在创建数据库 ${taskDatabase}...`);
    try {
      await client.query(`CREATE DATABASE ${taskDatabase}`);
    } catch (e) {
      if (e.code === "42P04") {
        console.log(`数据库 ${taskDatabase} 已存在`);
      } else {
        throw e;
      }
    }

    client.release();

    console.log(`正在连接到 ${taskDatabase} 数据库...`);
    const taskPool = new Pool({
      host: process.env.PG_HOST || "localhost",
      port: parseInt(process.env.PG_PORT) || 5432,
      database: taskDatabase,
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "postgres",
    });

    const taskClient = await taskPool.connect();

    console.log("正在创建 tasks 表...");
    await taskClient.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("正在创建更新时间触发器...");
    await taskClient.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await taskClient.query(`
      DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks
    `);

    await taskClient.query(`
      CREATE TRIGGER update_tasks_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    taskClient.release();
    await taskPool.end();
    await pool.end();

    console.log("✅ 数据库初始化完成！");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    process.exit(1);
  }
}

initDB();
