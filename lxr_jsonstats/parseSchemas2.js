const dumpPath = "/home/dthusian/Documents/appdata/MultiMc-instances/GT_New_Horizons_2.8.4_Java_17-25/.minecraft/RecEx-Records/";

const fs = require("fs");

function addObjToSchema(schema, o, prefix = "") {
  if (typeof o === "object") {
    if (o instanceof Array) {
      o.forEach(v => {
        addObjToSchema(schema, v, prefix + "[]");
      })
    } else if(o !== null) {
      const keys = Object.keys(o);
      keys.forEach(k => {
        addObjToSchema(schema, o[k], prefix + "." + k);
      });
    }
  }
  const oType = (o instanceof Array) ? "array" : typeof o;
  if (schema[prefix]) {
    if (!schema[prefix].includes(oType)) {
      schema[prefix].push(oType);
    }
  } else {
    schema[prefix] = [oType];
  }
}

console.log("reading recex.json");
const recipesText = fs.readFileSync(dumpPath + "/recex.json");
console.log("parsing recex.json");
const recipes = JSON.parse(recipesText);

const recipeSchemas = {};
console.log("processing recipes");
addObjToSchema(recipeSchemas, recipes);
const recipeSchemasCleaned = Object.fromEntries(Object.entries(recipeSchemas).map(([k, v]) => [k, v[0]]));
fs.writeFileSync("recipe_schemas.json", JSON.stringify(recipeSchemasCleaned));