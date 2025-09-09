// api/server.js
import { validateLogin } from './account';

export default async function handler(req, res) {
  // ===== Config Server Privat =====
  const PRIVAT = {
    PANEL_URL: "https://adpsianjayserver.privatserver.my.id",
    API_KEY: "API_KEY_PRIVAT",
    NODE_ID: 1,
    EGG_ID: 15,
    DOCKER_IMG: "ghcr.io/parkervcp/yolks:nodejs_24"
  };

  // ===== Config Server Publik =====
  const PUBLIK = {
    PANEL_URL: "https://tailahvvip.sallnetwork.web.id",
    API_KEY: "ptla_5cMcOcMZQ4FIThp32rFjh924PIemGJx98XFC3qLhYtu",
    NODE_ID: 1,
    EGG_ID: 15,
    DOCKER_IMG: "ghcr.io/parkervcp/yolks:nodejs_24"
  };

  // ===== Helper CPU Mapping =====
  function getCpu(ram) {
    if (ram == 0) return 0; // Unlimited RAM = Unlimited CPU
    return (ram / 1024) * 150; // 1GB=150, 2GB=300, dst
  }

  if (req.method === "GET") {
    try {
      // ===== Cek Server Privat =====
      const privRes = await fetch(`${PRIVAT.PANEL_URL}/api/application/servers`, {
        headers: { "Authorization": `Bearer ${PRIVAT.API_KEY}`, "Accept": "application/json" }
      });
      const privData = await privRes.json();

      // ===== Cek Server Publik =====
      const pubRes = await fetch(`${PUBLIK.PANEL_URL}/api/application/servers`, {
        headers: { "Authorization": `Bearer ${PUBLIK.API_KEY}`, "Accept": "application/json" }
      });
      const pubData = await pubRes.json();

      return res.json({
        success: true,
        server1: privRes.ok,
        server2: pubRes.ok,
        count1: privRes.ok ? privData.meta.pagination.total : 0,
        count2: pubRes.ok ? pubData.meta.pagination.total : 0
      });
    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }

  if (req.method === "POST") {
    const { action, username, password, name, ram, server } = req.body;

    try {
      // ===== Login =====
      if (action === "login") {
        if (validateLogin(username, password)) {
          return res.json({ success: true });
        } else {
          return res.json({ success: false, message: "Login gagal!" });
        }
      }

      // ===== Create server =====
      if (action === "create") {
        const config = server === "publik" ? PUBLIK : PRIVAT;

        const email = `user${Date.now()}@mail.com`;
        const userPassword = Math.random().toString(36).slice(-8);

        // Buat user baru
        const userRes = await fetch(`${config.PANEL_URL}/api/application/users`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.API_KEY}`,
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
        const allocRes = await fetch(`${config.PANEL_URL}/api/application/nodes/${config.NODE_ID}/allocations`, {
          headers: { "Authorization": `Bearer ${config.API_KEY}`, "Accept": "application/json" }
        });
        const allocData = await allocRes.json();
        const freeAlloc = allocData.data.find(a => a.attributes.assigned === false);
        if (!freeAlloc) {
          return res.json({ success: false, message: "Ga ada allocation kosong!" });
        }

        // Ambil environment variable default dari egg
        const eggRes = await fetch(`${config.PANEL_URL}/api/application/nests/5/eggs/${config.EGG_ID}?include=variables`, {
          headers: { "Authorization": `Bearer ${config.API_KEY}`, "Accept": "application/json" }
        });
        const eggData = await eggRes.json();
        const env = {};
        eggData.attributes.relationships.variables.data.forEach(v => {
          env[v.attributes.env_variable] = v.attributes.default_value || "";
        });

        // Buat server
        const serverRes = await fetch(`${config.PANEL_URL}/api/application/servers`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            name,
            user: userId,
            egg: config.EGG_ID,
            docker_image: config.DOCKER_IMG,
            startup: eggData.attributes.startup,
            limits: {
              memory: ram,
              swap: 0,
              disk: 5120,
              io: 500,
              cpu: getCpu(ram)
            },
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
          panel: config.PANEL_URL,
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
