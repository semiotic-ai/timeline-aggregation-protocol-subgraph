const fs = require('fs');
const path = require('path');
require('dotenv').config();

const filePath = path.resolve(__dirname, './src/v2/graph-tally-utils.ts');
let fileContent = fs.readFileSync(filePath, 'utf8');

fileContent = fileContent.replace(/{COLLECTOR_ADDRESS}/g, process.env.COLLECTOR_ADDRESS);

fs.writeFileSync(filePath, fileContent);
console.log('Environment variables replaced in mapping files.');