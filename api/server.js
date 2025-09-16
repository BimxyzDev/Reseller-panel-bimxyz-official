// api/server.js
import { MongoClient } from "mongodb";

// === CONFIG FIX ===
const NODE_ID     = 1;   // tetap hardcode
const EGG_ID      = 15;  // tetap hardcode
const DOCKER_IMG  = "ghcr.io/parkervcp/yolks:nodejs_24";

const MONGO_URI   = "mongodb+srv://bimaputra436123_db_user:UBw7SRgkBNZJKa9J@cluster0.6gh1zyd.mongodb.net/reseller_panel";
const ADMIN_USER  = "admin";
const ADMIN_PASS  = "12345";

// Reuse Mongo Client
let client;
async function getClient() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client;
}

async function getConfigFromDB() {
  const db = (await getClient()).db("reseller_panel");
  const col = db.collection("config");
  const cfg = await col.findOne({ type: "server" });
  return cfg || {};
}

export default async function handler(req, res) {
  // ===== ADMIN API =====
  if (req.method === "POST" && req.body?.action === "adminLogin") {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return res.json({ success: true, message: "Login admin berhasil" });
    }
    return res.json({ success: false, message: "User/pass salah!" });
  }

  if (req.method === "POST" && req.body?.action === "updateConfig") {
    const { panelUrl, apiKey } = req.body;
    try {
      const db = (await getClient()).db("reseller_panel");
      const col = db.collection("config");
      await col.updateOne(
        { type: "server" },
        { $set: { panelUrl, apiKey } },
        { upsert: true }
      );
      return res.json({ success: true, message: "Config berhasil diupdate" });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  if (req.method === "GET" && req.query?.action === "getConfig") {
    try {
      const cfg = await getConfigFromDB();
      return res.json({ success: true, data: cfg });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  // ===== USER API =====
  if (req.method === "GET") {
    try {
      const { panelUrl, apiKey } = await getConfigFromDB();
      if (!panelUrl || !apiKey) {
        return res.json({ success: false, message: "Config belum diset di admin panel" });
      }

      const serverRes = await fetch(`${panelUrl}/api/application/servers`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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

  if (req.method === "POST") {
    const { action, username, password, name, ram, serverId } = req.body;

    try {
      const { panelUrl, apiKey } = await getConfigFromDB();
      if (!panelUrl || !apiKey) {
        return res.json({ success: false, message: "Config belum diset di admin panel" });
      }

      // ===== Login user =====
      if (action === "login") {
        if (username === "user" && password === "pass") {
          return res.json({ success: true });
        } else {
          return res.json({ success: false, message: "Login gagal!" });
        }
      }

      // ===== Create server =====
      if (action === "create") {
        const email = `user${Date.now()}@mail.com`;
        const userPassword = Math.random().toString(36).slice(-8);

        // Buat user baru
        const userRes = await fetch(`${panelUrl}/api/application/users`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
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
        const allocRes = await fetch(`${panelUrl}/api/application/nodes/${NODE_ID}/allocations`, {
          headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" }
        });
        const allocData = await allocRes.json();
        const freeAlloc = allocData.data.find(a => a.attributes.assigned === false);
        if (!freeAlloc) {
          return res.json({ success: false, message: "Ga ada allocation kosong!" });
        }

        // Ambil environment variable default dari egg
        const eggRes = await fetch(`${panelUrl}/api/application/nests/5/eggs/${EGG_ID}?include=variables`, {
          headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" }
        });
        const eggData = await eggRes.json();
        const env = {};
        eggData.attributes.relationships.variables.data.forEach(v => {
          env[v.attributes.env_variable] = v.attributes.default_value || "";
        });

        // Buat server
        const serverRes = await fetch(`${panelUrl}/api/application/servers`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
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
          panel: panelUrl,
          username: userData.attributes.username,
          email: userData.attributes.email,
          password: userPassword,
          ram,
          serverId: serverData.attributes.id
        });
      }

      // ===== Delete server =====
      if (action === "delete") {
        if (!serverId) {
          return res.json({ success: false, message: "Server ID harus ada!" });
        }
        const delRes = await fetch(`${panelUrl}/api/application/servers/${serverId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
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
