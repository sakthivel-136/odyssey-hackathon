import re

with open("frontend/src/app/(dashboard)/dashboard/page.tsx", "r") as f:
    content = f.read()

old_line = "{item.dose_quantity}x {item.medicines.name} <span"
new_line = "{item.dose_quantity}x {item.medicines?.name || 'Unknown Medicine'} <span"

content = content.replace(old_line, new_line)

with open("frontend/src/app/(dashboard)/dashboard/page.tsx", "w") as f:
    f.write(content)
print("Dashboard Secondary Error Patched")
