const dumpPath = "/home/dthusian/Documents/appdata/MultiMc-instances/GT_New_Horizons_2.8.4_Java_17-25/.minecraft/RecEx-Records/recex.json";
const fs = require("fs");
console.log("reading recex.json");
const recipesText = fs.readFileSync(dumpPath);
console.log("parsing recex.json");
const recipes = JSON.parse(recipesText);
const sqlite = require("node:sqlite");

const db = new sqlite.DatabaseSync();
db.exec(`
create table itemDefs(
  itemid integer primary key autoincrement,
  isFluid integer,
);

create table recipesGt(
  recipeid integer primary key autoincrement,
  machineid integer,
  powerEut integer,
  durationTicks integer,
  
);
`);