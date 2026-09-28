import re

with open("frontend/src/app/(dashboard)/dashboard/page.tsx", "r") as f:
    content = f.read()

# Replace the specific mapping line to add safe navigation
old_line = "nextSchedule.schedule_items.map((i:any) => `${i.dose_quantity}x ${i.medicines.name}`).join(' • ')"
new_line = "nextSchedule.schedule_items.map((i:any) => `${i.dose_quantity}x ${i.medicines?.name || 'Unknown Medicine'}`).join(' • ')"

content = content.replace(old_line, new_line)

with open("frontend/src/app/(dashboard)/dashboard/page.tsx", "w") as f:
    f.write(content)
print("Dashboard Error Patched")
