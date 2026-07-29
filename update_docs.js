const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src/routes');
const docsDir = path.join(__dirname, 'docs');

function getRoutes() {
  const routeMap = {};
  const files = fs.readdirSync(routesDir);
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const endpoints = [];
    const lines = content.split('\n');
    lines.forEach(line => {
      const match = line.match(/router\.(get|post|put|delete|patch)\((['"`])(.*?)\2/);
      if (match) {
        endpoints.push({ method: match[1].toUpperCase(), path: match[3] });
      }
    });
    routeMap[file] = endpoints;
  });
  return routeMap;
}

function checkDocs(routeMap) {
  const docs = fs.readdirSync(docsDir);
  docs.forEach(doc => {
    if (!doc.endsWith('.md')) return;
    const content = fs.readFileSync(path.join(docsDir, doc), 'utf8');
    console.log(`\n--- ${doc} ---`);
    
    if (doc.includes('consumer')) {
      (routeMap['wallet.routes.js'] || []).forEach(r => {
        if (!content.includes(r.path)) {
          console.log(`Missing consumer route: ${r.method} /api/wallet${r.path === '/' ? '' : r.path}`);
        }
      });
      (routeMap['wishlist.routes.js'] || []).forEach(r => {
        if (!content.includes(r.path)) {
          console.log(`Missing consumer route: ${r.method} /api/wishlist${r.path === '/' ? '' : r.path}`);
        }
      });
      (routeMap['ticket.routes.js'] || []).forEach(r => {
        if (!content.includes(r.path)) {
          console.log(`Missing consumer route: ${r.method} /api/tickets${r.path === '/' ? '' : r.path}`);
        }
      });
      (routeMap['membership.routes.js'] || []).forEach(r => {
        if (!content.includes(r.path)) {
          console.log(`Missing consumer route: ${r.method} /api/membership${r.path === '/' ? '' : r.path}`);
        }
      });
    } else if (doc.includes('restaurant')) {
      (routeMap['owner.routes.js'] || []).forEach(r => {
        const checkPath = r.path.replace(':restaurantId', '<restaurantId>');
        if (!content.includes(checkPath)) {
          console.log(`Missing owner route: ${r.method} ${r.path}`);
        }
      });
    } else if (doc.includes('delivery')) {
      (routeMap['partner.routes.js'] || []).forEach(r => {
        if (!content.includes(r.path.replace(':id', '<orderId>'))) {
          console.log(`Missing delivery partner route: ${r.method} ${r.path}`);
        }
      });
    } else if (doc.includes('admin')) {
      (routeMap['admin.routes.js'] || []).forEach(r => {
        if (!content.includes(r.path.replace(':id', '<userId>').replace(':id', '<restaurantId>'))) {
          console.log(`Missing admin route: ${r.method} ${r.path}`);
        }
      });
    }
  });
}

const routes = getRoutes();
checkDocs(routes);
