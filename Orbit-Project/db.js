import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, "pulse.db"));
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
  );

  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY(project_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','doing','done')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, status);
  CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);
`);

const userCount = Number(db.prepare("SELECT COUNT(*) AS n FROM users").get().n);

if (userCount === 0) {
  const hash = bcrypt.hashSync("demo123", 10);
  const insertUser = db.prepare(
    `INSERT INTO users (username, email, password_hash, display_name, bio)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertPost = db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)");
  const insertComment = db.prepare(
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)"
  );
  const insertLike = db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)");
  const insertFollow = db.prepare(
    "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)"
  );

  db.exec("BEGIN");
  insertUser.run(
    "gagan",
    "gagan@pulse.app",
    hash,
    "Gagan Mehta",
    "Building things. Internship season. Coffee in one hand, terminal in the other."
  );
  insertUser.run(
    "aisha",
    "aisha@pulse.app",
    hash,
    "Aisha Khan",
    "Design, cities, and playlists that never skip."
  );
  insertUser.run(
    "rahul",
    "rahul@pulse.app",
    hash,
    "Rahul Sharma",
    "Backend notes, cricket scores, and weekend hikes."
  );

  insertPost.run(1, "Shipped Task 1. Pulse is next — profiles, posts, and a real follow graph.");
  insertPost.run(2, "Moodboard for a social UI: warm paper, sharp type, one loud accent color.");
  insertPost.run(3, "If your API has likes and follows, test the unique constraints first.");
  insertPost.run(1, "Demo accounts share the password demo123. Don't do that in production.");
  insertPost.run(2, "Comment threads are where a feed starts feeling like a room.");

  insertComment.run(1, 2, "Clean brief. Ship it.");
  insertComment.run(1, 3, "Need a seed user trio so the feed is never empty.");
  insertComment.run(2, 1, "Paper background is a good call.");
  insertComment.run(3, 1, "UNIQUE(user_id, post_id) saved me last time.");

  insertLike.run(2, 1);
  insertLike.run(3, 1);
  insertLike.run(1, 2);
  insertLike.run(3, 2);
  insertLike.run(1, 3);
  insertLike.run(2, 5);

  insertFollow.run(1, 2);
  insertFollow.run(1, 3);
  insertFollow.run(2, 1);
  insertFollow.run(3, 1);
  db.exec("COMMIT");
}

if (Number(db.prepare("SELECT COUNT(*) AS n FROM projects").get().n) === 0 && userCount >= 3) {
  const insertProject = db.prepare("INSERT INTO projects(name,description,owner_id) VALUES(?,?,?)");
  const projectId = Number(insertProject.run("Website refresh", "A shared space for the next chapter of our website.", 1).lastInsertRowid);
  const addMember = db.prepare("INSERT OR IGNORE INTO project_members(project_id,user_id,role) VALUES(?,?,?)");
  [[1,"owner"],[2,"member"],[3,"member"]].forEach(([userId,role])=>addMember.run(projectId,userId,role));
  const addTask=db.prepare("INSERT INTO tasks(project_id,title,description,status,priority,assignee_id,due_date,created_by) VALUES(?,?,?,?,?,?,?,?)");
  addTask.run(projectId,"Gather inspiration","Collect references and ideas for the new look.","done","normal",2,"2026-10-02",1);
  addTask.run(projectId,"Map the key pages","Outline the main pages and how they connect.","doing","high",1,"2026-10-08",1);
  addTask.run(projectId,"Sketch the homepage","Explore a few directions for the first screen.","todo","normal",2,"2026-10-12",1);
  addTask.run(projectId,"Review the content","Give the copy a quick pass before handoff.","todo","low",3,null,1);
}

export function publicUser(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    createdAt: row.created_at,
    ...extras,
  };
}
