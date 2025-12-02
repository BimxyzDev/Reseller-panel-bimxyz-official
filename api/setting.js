// api/setting.js

export default function handler(req, res) {
  res.json({
    github: {
      token: "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",
      owner: "BimxyzDev",
      repo: "Reseller-panel-bimxyzoffc",

      userFile: "api/user.js",     // file akun user
      panelFile: "api/panel.js"    // file pengaturan panel
    },

    login: {
      //data web manage user
      userManager: {
        username: "Bimxyz",
        password: "0857971"
      },
      //data web manage panel
      panelManager: {
        username: "Admin",
        password: "089654288"
      }
    }
  });
}

/*export default function handler(req, res) {
  res.json({
    github: {
      token: "token",
      owner: "BimxyzDev",
      repo: "Reseller-panel-bimxyzoffc",

      userFile: "api/user.js",     // file akun user
      panelFile: "api/panel.js"    // file pengaturan panel
    },

    login: {
      //data web manage user
      userManager: {
        username: "Bimxyz",
        password: "0857971"
      },
      //data web manage panel
      panelManager: {
        username: "Admin",
        password: "089654288"
      }
    }
  });
}
*/
