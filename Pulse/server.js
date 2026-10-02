import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, publicUser } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;
const COOKIE = "pulse_session";
const SECRET = process.env.SESSION_SECRET || "pulse-internship-dev-secret";

app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(express.static(join(__dirname, "public")));

function sign(userId) {
  const payload = Buffer.from(String(userId), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function readSession(req) {
  const token = req.cookies[COOKIE];
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const id = Number(Buffer.from(payload, "base64url").toString("utf8"));
  if (!Number.isInteger(id)) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

function requireAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: "Sign in required." });
  req.user = user;
  next();
}

function setSession(res, userId) {
  res.cookie(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function countsFor(userId, viewerId) {
  const posts = Number(db.prepare("SELECT COUNT(*) AS n FROM posts WHERE user_id = ?").get(userId).n);
  const followers = Number(
    db.prepare("SELECT COUNT(*) AS n FROM follows WHERE following_id = ?").get(userId).n
  );
  const following = Number(
    db.prepare("SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?").get(userId).n
  );
  const isFollowing = viewerId
    ? Boolean(
        db
          .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
          .get(viewerId, userId)
      )
    : false;
  return { posts, followers, following, isFollowing, isSelf: viewerId === userId };
}

function postRow(row, viewerId) {
  const liked = viewerId
    ? Boolean(
        db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?").get(viewerId, row.id)
      )
    : false;
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    likeCount: Number(row.like_count),
    commentCount: Number(row.comment_count),
    liked,
    author: publicUser({
      id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      bio: row.bio,
      created_at: row.user_created,
    }),
  };
}

const POST_SELECT = `
  SELECT
    p.id, p.content, p.created_at, p.user_id,
    u.username, u.display_name, u.bio, u.created_at AS user_created,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
  FROM posts p
  JOIN users u ON u.id = p.user_id
`;

app.get("/api/me", (req, res) => {
  const user = readSession(req);
  if (!user) return res.json({ user: null });
  res.json({ user: publicUser(user, countsFor(user.id, user.id)) });
});

app.post("/api/register", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const email = String(req.body?.email || "").trim();
  const displayName = String(req.body?.displayName || "").trim();
  const password = String(req.body?.password || "");
  const bio = String(req.body?.bio || "").trim();

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: "Username must be 3–20 letters, numbers, or underscores." });
  }
  if (!email.includes("@") || email.length > 80) {
    return res.status(400).json({ error: "Enter a valid email." });
  }
  if (displayName.length < 2 || displayName.length > 40) {
    return res.status(400).json({ error: "Display name must be 2–40 characters." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (bio.length > 180) {
    return res.status(400).json({ error: "Bio is too long." });
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, display_name, bio)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(username, email, bcrypt.hashSync(password, 10), displayName, bio);
    const newId = Number(info.lastInsertRowid);
    setSession(res, newId);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(newId);
    res.status(201).json({ user: publicUser(user, countsFor(user.id, user.id)) });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "That username or email is already taken." });
    }
    throw err;
  }
});

app.post("/api/login", (req, res) => {
  const identifier = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const user = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Wrong username or password." });
  }
  setSession(res, user.id);
  res.json({ user: publicUser(user, countsFor(user.id, user.id)) });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.patch("/api/me", requireAuth, (req, res) => {
  const displayName = String(req.body?.displayName ?? req.user.display_name).trim();
  const bio = String(req.body?.bio ?? req.user.bio).trim();
  if (displayName.length < 2 || displayName.length > 40) {
    return res.status(400).json({ error: "Display name must be 2–40 characters." });
  }
  if (bio.length > 180) return res.status(400).json({ error: "Bio is too long." });
  db.prepare("UPDATE users SET display_name = ?, bio = ? WHERE id = ?").run(
    displayName,
    bio,
    req.user.id
  );
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(user, countsFor(user.id, user.id)) });
});

app.get("/api/users", (req, res) => {
  const viewer = readSession(req);
  const rows = db
    .prepare("SELECT * FROM users ORDER BY display_name COLLATE NOCASE")
    .all();
  res.json({
    users: rows.map((row) => publicUser(row, countsFor(row.id, viewer?.id))),
  });
});

app.get("/api/users/:username", (req, res) => {
  const viewer = readSession(req);
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(req.params.username);
  if (!row) return res.status(404).json({ error: "User not found." });
  const posts = db
    .prepare(`${POST_SELECT} WHERE p.user_id = ? ORDER BY p.created_at DESC, p.id DESC`)
    .all(row.id)
    .map((p) => postRow(p, viewer?.id));
  res.json({
    user: publicUser(row, countsFor(row.id, viewer?.id)),
    posts,
  });
});

app.post("/api/users/:username/follow", requireAuth, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE username = ?").get(req.params.username);
  if (!target) return res.status(404).json({ error: "User not found." });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: "You cannot follow yourself." });
  }
  db.prepare("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)").run(
    req.user.id,
    target.id
  );
  res.json({ user: publicUser(target, countsFor(target.id, req.user.id)) });
});

app.delete("/api/users/:username/follow", requireAuth, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE username = ?").get(req.params.username);
  if (!target) return res.status(404).json({ error: "User not found." });
  db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(
    req.user.id,
    target.id
  );
  res.json({ user: publicUser(target, countsFor(target.id, req.user.id)) });
});

app.get("/api/posts", (req, res) => {
  const viewer = readSession(req);
  const feed = String(req.query.feed || "all");
  let sql = `${POST_SELECT} ORDER BY p.created_at DESC, p.id DESC LIMIT 80`;
  let rows;
  if (feed === "following") {
    if (!viewer) return res.status(401).json({ error: "Sign in required." });
    sql = `${POST_SELECT}
      WHERE p.user_id = ? OR p.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = ?
      )
      ORDER BY p.created_at DESC, p.id DESC LIMIT 80`;
    rows = db.prepare(sql).all(viewer.id, viewer.id);
  } else {
    rows = db.prepare(sql).all();
  }
  res.json({ posts: rows.map((row) => postRow(row, viewer?.id)) });
});

app.post("/api/posts", requireAuth, (req, res) => {
  const content = String(req.body?.content || "").trim();
  if (content.length < 1 || content.length > 500) {
    return res.status(400).json({ error: "Posts must be 1–500 characters." });
  }
  const info = db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)").run(
    req.user.id,
    content
  );
  const row = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(Number(info.lastInsertRowid));
  res.status(201).json({ post: postRow(row, req.user.id) });
});

app.post("/api/posts/:id/like", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const exists = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
  if (!exists) return res.status(404).json({ error: "Post not found." });
  const liked = db
    .prepare("SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?")
    .get(req.user.id, postId);
  if (liked) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(req.user.id, postId);
  } else {
    db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)").run(req.user.id, postId);
  }
  const row = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(postId);
  res.json({ post: postRow(row, req.user.id) });
});

app.get("/api/posts/:id/comments", (req, res) => {
  const postId = Number(req.params.id);
  const exists = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
  if (!exists) return res.status(404).json({ error: "Post not found." });
  const comments = db
    .prepare(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username, u.display_name
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC, c.id ASC`
    )
    .all(postId)
    .map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      author: { id: c.user_id, username: c.username, displayName: c.display_name },
    }));
  res.json({ comments });
});

app.post("/api/posts/:id/comments", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const exists = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
  if (!exists) return res.status(404).json({ error: "Post not found." });
  const content = String(req.body?.content || "").trim();
  if (content.length < 1 || content.length > 280) {
    return res.status(400).json({ error: "Comments must be 1–280 characters." });
  }
  const info = db
    .prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
    .run(postId, req.user.id, content);
  const comment = db
    .prepare(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username, u.display_name
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`
    )
    .get(Number(info.lastInsertRowid));
  const row = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(postId);
  res.status(201).json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      author: {
        id: comment.user_id,
        username: comment.username,
        displayName: comment.display_name,
      },
    },
    post: postRow(row, req.user.id),
  });
});

function projectMember(projectId, userId) {
  return db.prepare("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?").get(projectId, userId);
}

app.get("/api/users", requireAuth, (req, res) => {
  res.json({ users: db.prepare("SELECT id, username, display_name AS displayName FROM users ORDER BY display_name").all() });
});

app.get("/api/projects", requireAuth, (req, res) => {
  const projects = db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) task_count,
    (SELECT COUNT(*) FROM project_members m WHERE m.project_id=p.id) member_count
    FROM projects p JOIN project_members m ON m.project_id=p.id WHERE m.user_id=? ORDER BY p.created_at DESC`).all(req.user.id);
  res.json({ projects });
});

app.post("/api/projects", requireAuth, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: "Project name must be 2–80 characters." });
  const info = db.prepare("INSERT INTO projects(name,description,owner_id) VALUES(?,?,?)").run(name, description.slice(0,500), req.user.id);
  const id = Number(info.lastInsertRowid);
  db.prepare("INSERT INTO project_members(project_id,user_id,role) VALUES(?,?,'owner')").run(id, req.user.id);
  res.status(201).json({ project: db.prepare("SELECT * FROM projects WHERE id=?").get(id) });
});

app.post("/api/projects/:id/members", requireAuth, (req, res) => {
  const id = Number(req.params.id), project = db.prepare("SELECT * FROM projects WHERE id=?").get(id);
  if (!project || !projectMember(id, req.user.id)) return res.status(404).json({ error: "Project not found." });
  const identifier = String(req.body?.username || "").trim();
  const user = db.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE").get(identifier, identifier);
  if (!user) return res.status(404).json({ error: "No account found for that username or email." });
  db.prepare("INSERT OR IGNORE INTO project_members(project_id,user_id) VALUES(?,?)").run(id, user.id);
  if (user.id !== req.user.id) db.prepare("INSERT INTO notifications(user_id,project_id,message) VALUES(?,?,?)").run(user.id,id,`You were added to ${project.name}`);
  res.json({ ok: true });
});

app.get("/api/projects/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!projectMember(id, req.user.id)) return res.status(404).json({ error: "Project not found." });
  const project = db.prepare("SELECT * FROM projects WHERE id=?").get(id);
  const members = db.prepare("SELECT u.id,u.username,u.display_name AS displayName,m.role FROM project_members m JOIN users u ON u.id=m.user_id WHERE m.project_id=? ORDER BY m.role DESC,u.display_name").all(id);
  const tasks = db.prepare(`SELECT t.*, u.display_name AS assignee_name, u.username AS assignee_username,
    (SELECT COUNT(*) FROM task_comments c WHERE c.task_id=t.id) comment_count
    FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.project_id=? ORDER BY t.created_at DESC`).all(id);
  res.json({ project, members, tasks });
});

app.post("/api/projects/:id/tasks", requireAuth, (req, res) => {
  const projectId = Number(req.params.id);
  if (!projectMember(projectId, req.user.id)) return res.status(404).json({ error: "Project not found." });
  const title = String(req.body?.title || "").trim();
  if (!title || title.length > 140) return res.status(400).json({ error: "Task title is required (140 characters max)." });
  const assignee = req.body?.assigneeId ? Number(req.body.assigneeId) : null;
  if (assignee && !projectMember(projectId, assignee)) return res.status(400).json({ error: "Assignee must be a project member." });
  const info = db.prepare("INSERT INTO tasks(project_id,title,description,priority,assignee_id,due_date,created_by) VALUES(?,?,?,?,?,?,?)")
    .run(projectId,title,String(req.body?.description||"").slice(0,1000),["low","normal","high"].includes(req.body?.priority)?req.body.priority:"normal",assignee,req.body?.dueDate||null,req.user.id);
  if (assignee && assignee !== req.user.id) db.prepare("INSERT INTO notifications(user_id,project_id,message) VALUES(?,?,?)").run(assignee,projectId,`You were assigned “${title}”`);
  res.status(201).json({ task: db.prepare("SELECT * FROM tasks WHERE id=?").get(Number(info.lastInsertRowid)) });
});

app.patch("/api/tasks/:id", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(Number(req.params.id));
  if (!task || !projectMember(task.project_id, req.user.id)) return res.status(404).json({ error: "Task not found." });
  const status = req.body?.status;
  if (!["todo","doing","done"].includes(status)) return res.status(400).json({ error: "Invalid task status." });
  db.prepare("UPDATE tasks SET status=? WHERE id=?").run(status, task.id);
  res.json({ ok: true });
});

app.get("/api/tasks/:id/comments", requireAuth, (req, res) => {
  const task = db.prepare("SELECT project_id FROM tasks WHERE id=?").get(Number(req.params.id));
  if (!task || !projectMember(task.project_id, req.user.id)) return res.status(404).json({ error: "Task not found." });
  const comments = db.prepare("SELECT c.id,c.content,c.created_at AS createdAt,u.display_name AS displayName,u.username FROM task_comments c JOIN users u ON u.id=c.user_id WHERE c.task_id=? ORDER BY c.created_at,c.id").all(Number(req.params.id));
  res.json({ comments });
});

app.post("/api/tasks/:id/comments", requireAuth, (req, res) => {
  const task = db.prepare("SELECT t.*,p.name project_name FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.id=?").get(Number(req.params.id));
  if (!task || !projectMember(task.project_id, req.user.id)) return res.status(404).json({ error: "Task not found." });
  const content = String(req.body?.content||"").trim();
  if (!content || content.length>1000) return res.status(400).json({ error: "Comment must be 1–1000 characters." });
  db.prepare("INSERT INTO task_comments(task_id,user_id,content) VALUES(?,?,?)").run(task.id,req.user.id,content);
  db.prepare("INSERT INTO notifications(user_id,project_id,message) SELECT user_id,?,? FROM project_members WHERE project_id=? AND user_id!=?").run(task.project_id,`${req.user.display_name} commented on “${task.title}”`,task.project_id,req.user.id);
  res.status(201).json({ ok: true });
});

app.get("/api/notifications", requireAuth, (req, res) => {
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 30").all(req.user.id);
  res.json({ notifications, unread: Number(db.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read=0").get(req.user.id).n) });
});
app.post("/api/notifications/read", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read=1 WHERE user_id=?").run(req.user.id); res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Pulse running at http://localhost:${PORT}`);
});
