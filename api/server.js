// api/server.js
import { MongoClient } from "mongodb";
import { validateLogin } from "./account";

const uri = process.env.MONGODB_URI; // simpen di .env
const client = new MongoClient(uri);

// Konstanta (tetap di repo, bukan DB)
const NODE_ID = 1;
const EGG_ID = 15;
const DOCKER_IMG = "ghcr.io/parkervcp/yolks:nodejs_24";

// Login Admin hardcode / dari .env
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "password";

export default async function handler(req, res) {
  await client.connect();
  const db = client.db("reseller_panel");
  const configCollection = db.collection("config");
  const usersCollection = db.collection("users");

  // Ambil config panel_url & api_key
  const config = await configCollection.findOne({ _id: "panelConfig" });

  let PANEL_URL = config?.panel_url || "https://your-default-panel.url";
  let API_KEY = config?.api_key || "your-default-apikey";

  if (req.method === "POST") {
    const { action, username, password, name, ram, serverId, role } = req.body;

    try {
      // ====== Login ======
      if (action === "login") {
        if (role === "admin") {
          if (username === ADMIN_USER && password === ADMIN_PASS) {
            return res.json({ success: true, role: "admin" });
          }
          return res.json({ success: false, message: "Login admin gagal!" });
        }

        if (role === "user") {
          if (validateLogin(username, password)) {
            return res.json({ success: true, role: "user" });
          }
          return res.json({ success: false, message: "Login user gagal!" });
        }
      }

      // ====== Create server (User) ======
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

        // Simpan user ke DB
        await usersCollection.insertOne({
          username: userData.attributes.username,
          email: userData.attributes.email,
          password: userPassword,
          ram,
          serverId: serverData.attributes.id,
          createdAt: new Date()
        });

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

      // ====== Delete server ======
      if (action === "delete") {
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
          await usersCollection.deleteOne({ serverId });
          return res.json({ success: true, message: "Server berhasil dihapus" });
        } else {
          const errData = await delRes.json();
          return res.json({ success: false, message: JSON.stringify(errData) });
        }
      }

      // ====== Admin update config ======
      if (action === "updateConfig" && role === "admin") {
        const { panel_url, api_key } = req.body;
        await configCollection.updateOne(
          { _id: "panelConfig" },
          { $set: { panel_url, api_key } },
          { upsert: true }
        );
        return res.json({ success: true, message: "Config berhasil diupdate" });
      }

      // ====== Admin lihat user ======
      if (action === "listUsers" && role === "admin") {
        const users = await usersCollection.find().toArray();
        return res.json({ success: true, users });
      }

      return res.json({ success: false, message: "Action tidak dikenal" });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  // ====== GET → jumlah server ======
  if (req.method === "GET") {
    try {
      const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Accept": "application/json"
        }
      });
      const serverData = await serverRes.json();
      if (!serverRes.ok) {
        return res.json({ success: false, message: JSON.stringify(serverData) });
      }
      return res.json({
        success: true,
        count: serverData.meta.pagination.total
      });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
              }
