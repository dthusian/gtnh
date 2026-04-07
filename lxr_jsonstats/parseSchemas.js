const dumpPath = "/home/dthusian/Documents/appdata/MultiMc-instances/GT_New_Horizons_2.8.4_Java_17-25/.minecraft/dumps/";

const fs = require("fs");

function addObjToSchema(schema, o, prefix = "") {
  if (typeof o === "object") {
    if (o instanceof Array) {
      o.forEach(v => {
        addObjToSchema(schema, v, prefix + "[]");
      })
    } else {
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

const beginTime = process.hrtime.bigint();
console.log("reading recipes.json");
const recipesText = fs.readFileSync(dumpPath + "/recipes.json");
console.log("reading recipes_stacks.json");
const recipeStacksText = fs.readFileSync(dumpPath + "/recipes_stacks.json");

console.log("parsing recipes.json");
const recipes = JSON.parse(recipesText);
console.log("parsing recipes_stacks.json");
const recipeStacks = JSON.parse(recipeStacksText);

console.log("processing recipes");
const recipeSchemas = {};
const stackSchema = {};
const recipeCounts = {};
recipes.queries.forEach(query => {
  query.handlers.forEach(handler => {
    if(!recipeCounts[handler]) {
      recipeCounts[handler] = handler.recipes.length;
    } else {
      recipeCounts[handler] += handler.recipes.length;
    }
    const schemaId = `${handler.id}/${handler.name}/${handler.tabName}`;
    if (!recipeSchemas[schemaId]) recipeSchemas[schemaId] = {};
    handler.recipes.forEach(v => addObjToSchema(recipeSchemas[schemaId], v));
    delete handler.recipes;
  })
});
Object.values(recipeStacks.items).forEach(item => {
  addObjToSchema(stackSchema, item);
});

console.log(recipeCounts);
fs.writeFileSync("recipe_schemas.json", JSON.stringify(recipeSchemas));
fs.writeFileSync("stack_schema.json", JSON.stringify(stackSchema));