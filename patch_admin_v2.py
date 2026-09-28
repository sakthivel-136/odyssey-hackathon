import re

with open("frontend/src/app/(dashboard)/admin/page.tsx", "r") as f:
    content = f.read()

# basicOrders, proOrders, ultraOrders logic update
content = content.replace("const ultraOrders = orders.filter(o => o.num_containers === 6);", "const ultraOrders = orders.filter(o => o.num_containers === 6 || o.num_containers === 16);")
content = content.replace("o.num_containers !== 11 && o.num_containers !== 6", "o.num_containers !== 11 && o.num_containers !== 6 && o.num_containers !== 16")

# Calculate MRR (Monthly)
old_mrr = r"const calculateRevenue = \(orderList: any\[\]\) => \{.*?\};.*?const totalRevenue = calculateRevenue\(orders\);"
new_mrr = """  const calculateMRR = (orderList: any[]) => {
    return orderList.reduce((acc, order) => {
      if (order.num_containers > 10) return acc + 150; // Premium Add-on is 150/mo
      return acc;
    }, 0);
  };
  
  const calculateHardwareSales = (orderList: any[]) => {
    return orderList.reduce((acc, order) => {
      if (order.num_containers === 1 || order.num_containers === 11) return acc + 4500;
      if (order.num_containers === 6 || order.num_containers === 16) return acc + 7000;
      return acc + 5000; // Pro is default fallback
    }, 0);
  };

  const totalMRR = calculateMRR(orders);
  const totalHardwareSales = calculateHardwareSales(orders);"""
content = re.sub(old_mrr, new_mrr, content, flags=re.DOTALL)

content = content.replace("const todayRevenue = calculateRevenue(todaysOrders);", "const todayMRR = calculateMRR(todaysOrders);\n  const todayHardwareSales = calculateHardwareSales(todaysOrders);")

# Update Dashboard UI Cards
old_kpi_cards = r"<div className=\"grid grid-cols-1 md:grid-cols-4 gap-6\">.*?</div>\s+<!-- Plan Distribution"
new_kpi_cards = """<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-600 mb-2 font-bold text-sm uppercase tracking-wider">
            <IndianRupee className="w-4 h-4" /> Total MRR (Monthly)
          </div>
          <div className="text-4xl font-black text-slate-900">₹{totalMRR.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">From Software Add-ons</div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold text-sm uppercase tracking-wider">
            <IndianRupee className="w-4 h-4" /> Hardware Sales
          </div>
          <div className="text-4xl font-black text-slate-900">₹{totalHardwareSales.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">Total One-Time Revenue</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-purple-600 mb-2 font-bold text-sm uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" /> Today's Sales
          </div>
          <div className="text-4xl font-black text-slate-900">₹{(todayHardwareSales + todayMRR).toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">{todaysOrders.length} new boxes sold today</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-indigo-600 mb-2 font-bold text-sm uppercase tracking-wider">
            <Users className="w-4 h-4" /> Total Boxes
          </div>
          <div className="text-4xl font-black text-slate-900">{orders.length}</div>
        </div>
      </div>

      {/* Plan Distribution"""
content = re.sub(old_kpi_cards, new_kpi_cards, content, flags=re.DOTALL)

# Update Table display
content = content.replace("const plan = order.num_containers === 1 ? 'Basic' : order.num_containers === 11 ? 'Basic+AI' : order.num_containers === 6 ? 'Ultra' : order.num_containers === 13 ? 'Pro+AI' : 'Pro';", "const plan = order.num_containers === 1 ? 'Basic' : order.num_containers === 11 ? 'Basic+AI' : order.num_containers === 6 ? 'Ultra' : order.num_containers === 16 ? 'Ultra+AI' : order.num_containers === 13 ? 'Pro+AI' : 'Pro';")
content = content.replace("const price = plan === 'Basic' ? 199 : plan === 'Basic+AI' ? 349 : plan === 'Ultra' ? 799 : plan === 'Pro+AI' ? 549 : 399;", "const hwPrice = plan.includes('Basic') ? 4500 : plan.includes('Ultra') ? 7000 : 5000; const hasAddon = plan.includes('+AI');")

content = content.replace("<th className=\"p-4\">MRR</th>", "<th className=\"p-4\">Hardware</th>\n<th className=\"p-4\">MRR (Add-on)</th>")
content = content.replace("<td className=\"p-4 font-bold text-slate-700\">₹{price}</td>", "<td className=\"p-4 font-bold text-slate-700\">₹{hwPrice}</td>\n<td className=\"p-4 font-bold text-emerald-600\">{hasAddon ? '₹150' : '-'}</td>")

content = content.replace("{plan === 'Ultra' && <span className=\"bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs font-bold\">Ultra</span>}", "{plan === 'Ultra' && <span className=\"bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs font-bold\">Ultra</span>}\n{plan === 'Ultra+AI' && <span className=\"bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold\">Ultra + Addon</span>}")

with open("frontend/src/app/(dashboard)/admin/page.tsx", "w") as f:
    f.write(content)
print("Admin Page V2 Patched")
