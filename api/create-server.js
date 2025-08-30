// api/create-server.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { action, username, password, name, ram } = req.body;

  // =========================
  // Konfigurasi Reseller & Panel
  // =========================
  const resellerUser = "123";                     
  const resellerPass = "1234";                    
  const PANEL_URL   = "https://adpsianjayserver.privatserver.my.id"; 
  const API_KEY     = "ptla_3KPJd57IqYW3akbO91rnQxLy4a1BVcWxSPoYohWxQE1";  // Application API Key
  const NODE_ID     = 1;                          // ganti sesuai node ID
  const EGG_ID      = 15;                         // ganti sesuai egg ID
  // =========================

  try {
    // 🔹 Login Reseller
    if (action === "login") {
      if (username === resellerUser && password === resellerPass) {
        return res.json({ success: true });
      } else {
        return res.json({ success: false, message: "Login gagal!" });
      }
    }

    // 🔹 Create User + Server
    if (action === "create") {
      const email = `user${Date.now()}@mail.com`;
      const userPassword = Math.random().toString(36).slice(-8);

      // Buat user baru (non-admin)
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

      // 🔹 Ambil semua allocation di node
      const allocRes = await fetch(`${PANEL_URL}/api/application/nodes/${NODE_ID}/allocations`, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      const allocData = await allocRes.json();

      // DEBUG: kirim balik semua allocation biar keliatan
      console.log("All allocations:", allocData.data.map(a => ({
        id: a.attributes.id,
        ip: a.attributes.ip,
        port: a.attributes.port,
        assigned_to: a.attributes.assigned_to
      })));

      // Cari allocation kosong
      const freeAlloc = allocData.data.find(a => !a.attributes.assigned_to);

      if (!freeAlloc) {
        return res.json({ success: false, message: "Tidak ada allocation kosong!" });
      }

      // 🔹 Buat server untuk user baru
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
          docker_image: "ghcr.io/parkervcp/yolks:nodejs_24", 
          startup: "npm start",
          limits: { memory: ram, swap: 0, disk: 5120, io: 500, cpu: 100 },
          environment: {}, // sesuaikan sesuai egg lu
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
        allocation: `${freeAlloc.attributes.ip}:${freeAlloc.attributes.port}`
      });
    }

    res.json({ success: false, message: "Action tidak dikenal" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
    }
