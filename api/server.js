// api/server.js
import { MongoClient } from "mongodb";
import { validateLogin } from "./account";

const uri = "mongodb+srv://bimaputra436123_db_user:UBw7SRgkBNZJKa9J@cluster0.6gh1zyd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

// Admin login hardcode
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

// Default static config (node_id dll tetep disini, ga ke DB)
const NODE_ID = 1;
const EGG_ID = 15;
const DOCKER_IMG = "ghcr.io/parkervcp/yolks:nodejs_24";

export default async function handler(req, res) {
  await client.connect();
  const db = client.db("reseller_panel");
  const configs = db.collection("configs");
  const users = db.collection("users");

  if (req.method === "POST") {
    const { action, username, password, name, ram, serverId, panelUrl, apiKey } = req.body;

    try {
      // ===== Admin Login =====
      if (action === "adminLogin") {
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          return res.json({ success: true, role: "admin" });
        }
        return res.json({ success: false, message: "Login admin gagal!" });
      }

      // ===== User Login (cPanel user) =====
      if (action === "login") {
        if (validateLogin(username, password)) {
          return res.json({ success: true, role: "user" });
        }
        return res.json({ success: false, message: "Login user gagal!" });
      }

      // ===== Tambah User cPanel =====
      if (action === "addUser") {
        await users.insertOne({ username, password });
        return res.json({ success: true, message: "User berhasil ditambahkan" });
      }

      // ===== Hapus User cPanel =====
      if (action === "deleteUser") {
        await users.deleteOne({ username });
        return res.json({ success: true, message: "User berhasil dihapus" });
      }

      // ===== Ambil semua user =====
      if (action === "getUsers") {
        const allUsers = await users.find().toArray();
        return res.json({ success: true, users: allUsers });
      }

      // ===== Update Config Panel =====
      if (action === "updateConfig") {
        await configs.updateOne({}, { $set: { panelUrl, apiKey } }, { upsert: true });
        return res.json({ success: true, message: "Config berhasil diperbarui" });
      }

      // ===== Ambil Config Panel =====
      if (action === "getConfig") {
        const config = await configs.findOne({});
        return res.json({ success: true, config });
      }

      // ===== Create Server =====
      if (action === "create") {
        const config = await configs.findOne({});
        if (!config) return res.json({ success: false, message: "Config panel belum diset!" });

        const PANEL_URL = config.panelUrl;
        const API_KEY = config.apiKey;

        const email = `user${Date.now()}@mail.com`;
        const userPassword = Math.random().toString(36).slice(-8);

        // Buat user baru
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

      // ===== Delete Server =====
      if (action === "delete") {
        const config = await configs.findOne({});
        if (!config) return res.json({ success: false, message: "Config panel belum diset!" });

        const PANEL_URL = config.panelUrl;
        const API_KEY = config.apiKey;

        if (!serverId) {
          return res.json({ success: false, message: "Server ID harus ada!" });
        }
        const delRes = await fetch(`${PANEL_URL}/api/application/servers/${serverId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Accept": "application/json"
          }
        });

        if (delRes.status === 204) {
          return res.json({ success: true, message: "Server berhasil dihapus" });
        } else {
          const errData = await delRes.json();
          return res.json({ success: false, message: JSON.stringify(errData) });
        }
      }

      return res.json({ success: false, message: "Action tidak dikenal" });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
          }
