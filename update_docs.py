import os
import re

routes_dir = 'src/routes'
docs_dir = 'docs'

def get_routes():
    route_map = {}
    for filename in os.listdir(routes_dir):
        if not filename.endswith('.js'): continue
        filepath = os.path.join(routes_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            endpoints = []
            for line in content.split('\n'):
                # match router.get('/path' or router.post('/path'
                match = re.search(r'router\.(get|post|put|delete|patch)\(([\'"`])(.*?)\2', line)
                if match:
                    method = match.group(1).upper()
                    path = match.group(3)
                    endpoints.append((method, path))
            route_map[filename] = endpoints
    return route_map

def check_docs(route_map):
    for doc in os.listdir(docs_dir):
        if not doc.endswith('.md'): continue
        docpath = os.path.join(docs_dir, doc)
        with open(docpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"--- {doc} ---")
        if 'consumer' in doc:
            for route in route_map.get('wallet.routes.js', []):
                if route[1] not in content and 'wallet' not in content:
                    print(f"Missing wallet: {route}")
            for route in route_map.get('wishlist.routes.js', []):
                if route[1] not in content and 'wishlist' not in content:
                    print(f"Missing wishlist: {route}")
            for route in route_map.get('ticket.routes.js', []):
                if route[1] not in content and 'ticket' not in content:
                    print(f"Missing ticket: {route}")
        
        elif 'restaurant' in doc:
            for route in route_map.get('owner.routes.js', []):
                if route[1].replace(':restaurantId', '<restaurantId>') not in content and 'settlement' in route[1]:
                    print(f"Missing settlement: {route}")
                if route[1].replace(':restaurantId', '<restaurantId>') not in content and 'table' in route[1]:
                    print(f"Missing table: {route}")

        elif 'delivery' in doc:
            for route in route_map.get('partner.routes.js', []):
                if route[1] not in content:
                    print(f"Missing delivery partner route: {route}")

if __name__ == '__main__':
    routes = get_routes()
    check_docs(routes)

