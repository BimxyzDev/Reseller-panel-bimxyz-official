// api/server.js
import { MongoClient } from "mongodb";

// ====== KONFIG REPO (hardcoded) ======
const MONGO_URI = "mongodb+srv://<user>:<pass>@cluster0.6gh1zyd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "reseller_panel";
const ADMIN_USER = "admin";       // admin login
const ADMIN_PASS = "admin123";    // admin login

// Konstanta server (tetap di repo)
const NODE_ID = 1;
const EGG_ID = 15;
const DOCKER_IMG = "ghcr.io/parkervcp/yolks:nodejs_24";

// ====== DB Connection Cache ======
let cachedClient = null;
async function connectDB() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

// ====== API HANDLER ======
export default async function handler(req, res) {
  const client = await connectDB();
  const db = client.db(DB_NAME);
  const settings = db.collection("settings");
  const users = db.collection("users");

  if (req.method === "POST") {
    const { action, username, password, name, ram, serverId, panelUrl, apiKey } = req.body;

    try {
      // ====== ADMIN LOGIN ======
      if (action === "adminLogin") {
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          return res.json({ success: true });
        }
        return res.json({ success: false, message: "Admin login gagal!" });
      }

      // ====== ADMIN: UPDATE CONFIG ======
      if (action === "updateConfig") {
        await settings.updateOne(
          { _id: "config" },
          { $set: { panelUrl, apiKey } },
          { upsert: true }
        );
        return res.json({ success: true, message: "Config berhasil disimpan!" });
      }

      // ====== ADMIN: GET CONFIG ======
      if (action === "getConfig") {
        const data = await settings.findOne({ _id: "config" });
        return res.json({ success: true, config: data || {} });
      }

      // ====== ADMIN: ADD USER ======
      if (action === "addUser") {
        if (!username || !password) return res.json({ success: false, message: "Username & password wajib!" });
        await users.insertOne({ username, password });
        return res.json({ success: true, message: "User berhasil ditambahkan!" });
      }

      // ====== ADMIN: GET USERS ======
      if (action === "getUsers") {
        const list = await users.find({}).toArray();
        return res.json({ success: true, users: list });
      }

      // ====== ADMIN: DELETE USER ======
      if (action === "deleteUser") {
        await users.deleteOne({ username });
        return res.json({ success: true, message: "User berhasil dihapus!" });
      }

      // ====== USER LOGIN ======
      if (action === "login") {
        const user = await users.findOne({ username, password });
        if (user) return res.json({ success: true });
        return res.json({ success: false, message: "Login gagal!" });
      }

      // ====== LOAD PANEL CONFIG ======
      const config = await settings.findOne({ _id: "config" });
      if (!config) {
        return res.json({ success: false, message: "Panel belum dikonfigurasi admin!" });
      }
      const PANEL_URL = config.panelUrl;
      const API_KEY = config.apiKey;

      // ====== CREATE SERVER ======
      if (action === "create") {
        const email = `user${Date.now()}@mail.com`;
        const userPassword = Math.random().toString(36).slice(-8);

        // Buat user baru di panel
        const userRes = await fetch(`${PANEL_URL}/api/application/users`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            email,
            username: name.toLowerCase().replace(/\s+/g, "_"),
            first_name: name,
            last_name: "Client",
            password: userPassword,
            root_admin: false
          })
        });
        const userData = await userRes.json();
        if (!userRes.ok) {
          return res.json({ success: false, message: JSON.stringify(userData) });
        }
        const userId = userData.attributes.id;

        // Cari allocation kosong
        const allocRes = await fetch(`${PANEL_URL}/api/application/nodes/${NODE_ID}/allocations`, {
          headers: { "Authorization": `Bearer ${API_KEY}`, "Accept": "application/json" }
        });
        const allocData = await allocRes.json();
        const freeAlloc = allocData.data.find(a => a.attributes.assigned === false);
        if (!freeAlloc) {
          return res.json({ success: false, message: "Ga ada allocation kosong!" });
        }

        // Ambil environment variable default dari egg
        const eggRes = await fetch(`${PANEL_URL}/api/application/nests/5/eggs/${EGG_ID}?include=variables`, {
          headers: { "Authorization": `Bearer ${API_KEY}`, "Accept": "application/json" }
        });
        const eggData = await eggRes.json();
        const env = {};
        eggData.attributes.relationships.variables.data.forEach(v => {
          env[v.attributes.env_variable] = v.attributes.default_value || "";
        });

        // Buat server
        const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            name,
            user: userId,
            egg: EGG_ID,
            docker_image: DOCKER_IMG,
            startup: eggData.attributes.startup,
            limits: { memory: ram, swap: 0, disk: 5120, io: 500, cpu: 100 },
            environment: env,
            feature_limits: { databases: 1, backups: 1, allocations: 1 },
            allocation: { default: freeAlloc.attributes.id }
          })
        });

        const serverData = await serverRes.json();
        if (!serverRes.ok) {
          return res.json({ success: false, message: JSON.stringify(serverData) });
        }

        return res.json({
          success: true,
          panel: PANEL_URL,
          username: userData.attributes.username,
          email: userData.attributes.email,
          password: userPassword,
          ram,
          serverId: serverData.attributes.id
        });
      }

      // ====== DELETE SERVER ======
      if (action === "delete") {
        if (!serverId) return res.json({ success: false, message: "Server ID harus ada!" });
        const delRes = await fetch(`${PANEL_URL}/api/application/servers/${serverId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${API_KEY}`, "Accept": "application/json" }
        });
        if (delRes.status === 204) {
          return res.json({ success: true, message: "Server berhasil dihapus!" });
        } else {
          const errData = await delRes.json();
          return res.json({ success: false, message: JSON.stringify(errData) });
        }
      }

      return res.json({ success: false, message: "Action tidak dikenal!" });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  if (req.method === "GET") {
    // ====== LIST SERVERS ======
    const config = await settings.findOne({ _id: "config" });
    if (!config) {
      return res.json({ success: false, message: "Panel belum dikonfigurasi admin!" });
    }
    const PANEL_URL = config.panelUrl;
    const API_KEY = config.apiKey;

    try {
      const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Accept": "application/json" }
      });
      const serverData = await serverRes.json();
      if (!serverRes.ok) {
        return res.json({ success: false, message: JSON.stringify(serverData) });
      }
      return res.json({ success: true, count: serverData.meta.pagination.total });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}
