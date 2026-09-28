import re

with open("frontend/src/app/(dashboard)/admin/page.tsx", "r") as f:
    content = f.read()

# Update basicOrders, proOrders
old_basic = "const basicOrders = orders.filter(o => o.num_containers === 1);"
new_basic = "const basicOrders = orders.filter(o => o.num_containers === 1 || o.num_containers === 11);"
content = content.replace(old_basic, new_basic)

old_pro = "const proOrders = orders.filter(o => o.num_containers === 3 || (o.num_containers !== 1 && o.num_containers !== 6));"
new_pro = "const proOrders = orders.filter(o => o.num_containers === 3 || o.num_containers === 13 || (o.num_containers !== 1 && o.num_containers !== 11 && o.num_containers !== 6));"
content = content.replace(old_pro, new_pro)

# Update Revenue calculation
old_calc = """    return orderList.reduce((acc, order) => {
      if (order.num_containers === 1) return acc + 199;
      if (order.num_containers === 6) return acc + 799;
      return acc + 399; // Pro is default fallback
    }, 0);"""
new_calc = """    return orderList.reduce((acc, order) => {
      if (order.num_containers === 1) return acc + 199;
      if (order.num_containers === 11) return acc + 199 + 150;
      if (order.num_containers === 3) return acc + 399;
      if (order.num_containers === 13) return acc + 399 + 150;
      if (order.num_containers === 6) return acc + 799;
      return acc + 399; // Pro is default fallback
    }, 0);"""
content = content.replace(old_calc, new_calc)

# Update User Segregation Table
old_table_plan = "const plan = order.num_containers === 1 ? 'Basic' : order.num_containers === 6 ? 'Ultra' : 'Pro';"
new_table_plan = "const plan = order.num_containers === 1 ? 'Basic' : order.num_containers === 11 ? 'Basic+AI' : order.num_containers === 6 ? 'Ultra' : order.num_containers === 13 ? 'Pro+AI' : 'Pro';"
content = content.replace(old_table_plan, new_table_plan)

old_table_price = "const price = plan === 'Basic' ? 199 : plan === 'Ultra' ? 799 : 399;"
new_table_price = "const price = plan === 'Basic' ? 199 : plan === 'Basic+AI' ? 349 : plan === 'Ultra' ? 799 : plan === 'Pro+AI' ? 549 : 399;"
content = content.replace(old_table_price, new_table_price)

old_table_badges = """                      {plan === 'Basic' && <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">Basic</span>}
                      {plan === 'Pro' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Pro</span>}
                      {plan === 'Ultra' && <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs font-bold">Ultra</span>}"""
new_table_badges = """                      {plan === 'Basic' && <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">Basic</span>}
                      {plan === 'Basic+AI' && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">Basic + Addon</span>}
                      {plan === 'Pro' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Pro</span>}
                      {plan === 'Pro+AI' && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">Pro + Addon</span>}
                      {plan === 'Ultra' && <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs font-bold">Ultra</span>}"""
content = content.replace(old_table_badges, new_table_badges)

with open("frontend/src/app/(dashboard)/admin/page.tsx", "w") as f:
    f.write(content)
print("Admin Page Patched")
