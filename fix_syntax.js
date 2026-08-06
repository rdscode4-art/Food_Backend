
const fs = require('fs');
const content = fs.readFileSync('D:/Rideal/Delivery/src/controllers/admin.controller.js', 'utf8');
const lines = content.split('\n');

// Remove lines 725 to 851 (1-indexed), which is 724 to 850 (0-indexed)
// These are duplicate functions that were accidentally injected
const cleaned = [...lines.slice(0, 724), ...lines.slice(851)];
fs.writeFileSync('D:/Rideal/Delivery/src/controllers/admin.controller.js', cleaned.join('\n'));
console.log('Removed duplicate block. Total lines:', cleaned.length);
