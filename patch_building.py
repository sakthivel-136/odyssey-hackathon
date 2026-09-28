import re

with open("frontend/src/app/(dashboard)/admin/building/page.tsx", "r") as f:
    content = f.read()

old_hardware_config = "{selectedOrder.num_containers} Servos & Compartments"
new_hardware_config = "{selectedOrder.num_containers > 10 ? selectedOrder.num_containers - 10 : selectedOrder.num_containers} Servos & Compartments"
content = content.replace(old_hardware_config, new_hardware_config)

# Find all instances of generateCppCode(selectedOrder.box_name, selectedOrder.num_containers)
content = content.replace("generateCppCode(selectedOrder.box_name, selectedOrder.num_containers)", "generateCppCode(selectedOrder.box_name, selectedOrder.num_containers > 10 ? selectedOrder.num_containers - 10 : selectedOrder.num_containers)")

with open("frontend/src/app/(dashboard)/admin/building/page.tsx", "w") as f:
    f.write(content)
print("Building Page Patched")
