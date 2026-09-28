import re

# Update Orders Page
with open("frontend/src/app/(dashboard)/orders/page.tsx", "r") as f:
    orders_content = f.read()

orders_content = orders_content.replace("₹3,000", "₹2,000")
orders_content = orders_content.replace("₹4,000", "₹2,750")
orders_content = orders_content.replace("₹4,500", "₹3,999")

# Fix button logic
orders_content = orders_content.replace(
    "`Purchase Hardware (₹${selectedPlan === 'Ultra' ? '4,500' : selectedPlan === 'Pro' ? '4,000' : '3,000'})${premiumAddon ? ' + Software Add-on (₹150/mo)' : ''}`",
    "`Purchase Hardware (₹${selectedPlan === 'Ultra' ? '3,999' : selectedPlan === 'Pro' ? '2,750' : '2,000'})${premiumAddon ? ' + Software Add-on (₹150/mo)' : ''}`"
)

with open("frontend/src/app/(dashboard)/orders/page.tsx", "w") as f:
    f.write(orders_content)

# Update Admin Page
with open("frontend/src/app/(dashboard)/admin/page.tsx", "r") as f:
    admin_content = f.read()

old_calc = """  const calculateHardwareSales = (orderList: any[]) => {
    return orderList.reduce((acc, order) => {
      if (order.num_containers === 1 || order.num_containers === 11) return acc + 3000;
      if (order.num_containers === 6 || order.num_containers === 16) return acc + 4500;
      return acc + 4000; // Pro is default fallback
    }, 0);
  };"""

new_calc = """  const calculateHardwareSales = (orderList: any[]) => {
    return orderList.reduce((acc, order) => {
      if (order.num_containers === 1 || order.num_containers === 11) return acc + 2000;
      if (order.num_containers === 6 || order.num_containers === 16) return acc + 3999;
      return acc + 2750; // Pro is default fallback
    }, 0);
  };"""

admin_content = admin_content.replace(old_calc, new_calc)

# Fix Table display logic
admin_content = admin_content.replace(
    "const hwPrice = plan.includes('Basic') ? 3000 : plan.includes('Ultra') ? 4500 : 4000;",
    "const hwPrice = plan.includes('Basic') ? 2000 : plan.includes('Ultra') ? 3999 : 2750;"
)

with open("frontend/src/app/(dashboard)/admin/page.tsx", "w") as f:
    f.write(admin_content)

print("Pricing Updated to V3")
