// api/setting.js

export default function handler(req, res) {
  res.json({
    github: {
      token: "YOUR_GITHUB_TOKEN",
      owner: "BimxyzDev",
      repo: "Reseller-panel-bimxyzoffc",

      userFile: "api/user.js",     // file akun user
      panelFile: "api/panel.js"    // file pengaturan panel
    },

    login: {
      userManager: {
        username: "adminUser",
        password: "1234"
      },
      panelManager: {
        username: "adminPanel",
        password: "9876"
      }
    }
  });
}
