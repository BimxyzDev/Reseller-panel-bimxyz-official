// api/account.js
export const accounts = [
  { username: "admin", password: "admin089654" },
  { username: "ashurammk", password: "ashurammk889" },
{ username: "ICHIGO", password: "ICHIGO001" },
{ username: "Akmal", password: "1707" },
{ username: "wendy", password: "wendy708" },
{ username: "sinz", password: "sinz001" },
{ username: "PAYZZ", password: "PAYZZ27" },
{ username: "adminch", password: "adminch5282" },
{ username: "adityagntng", password: "adit22376" },
{ username: "Revan", password: "Revan3044" },
{ username: "valltamvan", password: "1781945" },
  
];

export function validateLogin(username, password) {
  return accounts.some(acc => acc.username === username && acc.password === password);
}
