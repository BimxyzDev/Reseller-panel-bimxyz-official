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
{ username: "LANS", password: "LANSAJAH" },
{ username: "Yizzd", password: "462012" },
{ username: "rawrganteng", password: "rawrxrxtzy" },
{ username: "ALSTORE", password: "alnope22" },
{ username: "nopal", password: "nopal1987" },
{ username: "aditya store", password: "aditya522PU" },
{ username: "ress", password: "ress66" },
{ username: "reegie", password: "reegie717" },
{ username: "SEMPAKABU²", password: "BOLONG" },
{ username: "kyfan", password: "kyfan11" },
{ username: "Alvaz_str", password: "alvaz_str" },
{ username: "Davv", password: "naruto123" },
{ username: "VANZZ", password: "vanzz" },
  
];

export function validateLogin(username, password) {
  return accounts.some(acc => acc.username === username && acc.password === password);
}
