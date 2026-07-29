import os

docs_dir = r"d:\Rideal\Delivery\docs"
files_to_update = [
    "consumer-app-docs.md",
    "delivery-partner-app-docs.md",
    "restaurant-partner-app-docs.md",
    "admin-panel-docs.md",
    "api-documentation.md"
]

for filename in files_to_update:
    filepath = os.path.join(docs_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace 5000 with 6030 globally for local URLs
        updated_content = content.replace("localhost:5000", "localhost:6030")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(updated_content)
        print(f"Updated {filename} to port 6030.")
