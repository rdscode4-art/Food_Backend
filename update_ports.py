import os

docs = [
    r"d:\Rideal\Delivery\docs\consumer-app-docs.md",
    r"d:\Rideal\Delivery\docs\delivery-partner-app-docs.md",
    r"d:\Rideal\Delivery\docs\restaurant-partner-app-docs.md",
    r"d:\Rideal\Delivery\docs\admin-panel-docs.md"
]

for doc in docs:
    if os.path.exists(doc):
        with open(doc, "r", encoding="utf-8") as f:
            content = f.read()
        
        content = content.replace("6030", "5000")
        
        with open(doc, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {doc}")
