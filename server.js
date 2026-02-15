require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { Pool } = require("pg");
const Redis = require("ioredis");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const pgPool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || "task_board",
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
});

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
});

const CACHE_KEY = "tasks:all";
const CACHE_TTL = 60;

const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("新客户端已连接，当前连接数:", clients.size);

  ws.on("close", () => {
    clients.delete(ws);
    console.log("客户端已断开，当前连接数:", clients.size);
  });

  ws.on("error", (error) => {
    console.error("WebSocket 错误:", error);
  });
});

function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

async function getTasks() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn("Redis 缓存读取失败:", err);
  }

  const result = await pgPool.query(
    "SELECT * FROM tasks ORDER BY created_at DESC",
  );
  const tasks = result.rows;

  try {
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(tasks));
  } catch (err) {
    console.warn("Redis 缓存写入失败:", err);
  }

  return tasks;
}

async function invalidateCache() {
  try {
    await redis.del(CACHE_KEY);
  } catch (err) {
    console.warn("Redis 缓存失效失败:", err);
  }
}

app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await getTasks();
    res.json(tasks);
  } catch (error) {
    console.error("获取任务失败:", error);
    res.status(500).json({ error: "获取任务失败" });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title, description } = req.body;
  try {
    const result = await pgPool.query(
      "INSERT INTO tasks (title, description, status) VALUES ($1, $2, $3) RETURNING *",
      [title, description || "", "pending"],
    );
    const task = result.rows[0];
    await invalidateCache();
    broadcast({ type: "task_created", task });
    res.status(201).json(task);
  } catch (error) {
    console.error("创建任务失败:", error);
    res.status(500).json({ error: "创建任务失败" });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  try {
    const result = await pgPool.query(
      "UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status) WHERE id = $4 RETURNING *",
      [title, description, status, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "任务不存在" });
    }
    const task = result.rows[0];
    await invalidateCache();
    broadcast({ type: "task_updated", task });
    res.json(task);
  } catch (error) {
    console.error("更新任务失败:", error);
    res.status(500).json({ error: "更新任务失败" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pgPool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "任务不存在" });
    }
    const task = result.rows[0];
    await invalidateCache();
    broadcast({ type: "task_deleted", taskId: task.id });
    res.json({ message: "任务已删除" });
  } catch (error) {
    console.error("删除任务失败:", error);
    res.status(500).json({ error: "删除任务失败" });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 服务器已启动，访问 http://localhost:${PORT}`);
});
