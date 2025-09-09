// api/server.js
import { validateLogin } from './account';

export default async function handler(req, res) {
  const PANEL_URL = "https://adponlyanjayserver.sallnetwork.web.id";
  const API_KEY   = "ptla_Td0KbtDxnBVwF9yEAOpXVvOpMqEjYPk15rJyMruS85Q";
  const NODE_ID   = 1;
  const EGG_ID    = 15;
  const DOCKER_IMG = "ghcr.io/parkervcp/yolks:nodejs_24";

  if (req.method === "GET") {
    // ====== List servers ======
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

  if (req.method === "POST") {
    const { action, username, password, name, ram } = req.body;

    try {
      // ====== Login ======
      if (action === "login") {
        if (validateLogin(username, password)) {
          return res.json({ success: true });
        } else {
          return res.json({ success: false, message: "Login gagal!" });
        }
      }

      // ====== Create server ======
      if (action === "create") {
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
          ram
        });
      }

      return res.json({ success: false, message: "Action tidak dikenal" });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
          }
