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
        username: "adminUser",
        password: "1234"
      },
      //data web manage panel
      panelManager: {
        username: "adminPanel",
        password: "9876"
      }
    }
  });
}
