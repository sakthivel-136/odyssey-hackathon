import re

with open("frontend/src/app/(dashboard)/admin/orders/page.tsx", "r") as f:
    content = f.read()

old_str = "{order.num_containers} Compartments"
new_str = "{order.num_containers > 10 ? order.num_containers - 10 : order.num_containers} Compartments"

content = content.replace(old_str, new_str)

with open("frontend/src/app/(dashboard)/admin/orders/page.tsx", "w") as f:
    f.write(content)
print("Admin Orders Patched")
