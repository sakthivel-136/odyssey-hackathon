import re

with open("frontend/src/app/(dashboard)/orders/page.tsx", "r") as f:
    content = f.read()

# Add state for premiumAddon
content = content.replace(
    "const [selectedPlan, setSelectedPlan] = useState<string | null>(null);",
    "const [selectedPlan, setSelectedPlan] = useState<string | null>(null);\n  const [premiumAddon, setPremiumAddon] = useState<boolean>(false);"
)

# Update getContainersForPlan
old_get_containers = """  const getContainersForPlan = (plan: string) => {
    if (plan === 'Basic') return 1;
    if (plan === 'Pro') return 3;
    if (plan === 'Ultra') return 6;
    return 3;
  };"""
new_get_containers = """  const getContainersForPlan = (plan: string) => {
    if (plan === 'Basic') return premiumAddon ? 11 : 1;
    if (plan === 'Pro') return premiumAddon ? 13 : 3;
    if (plan === 'Ultra') return 6; // Ultra always has it
    return 3;
  };"""
content = content.replace(old_get_containers, new_get_containers)

# Update the toggle UI in the form section
old_form_head = """          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            Complete {selectedPlan} Plan Order <ArrowRight className="w-5 h-5 text-slate-400"/>
          </h2>"""
new_form_head = """          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            Complete {selectedPlan} Plan Order <ArrowRight className="w-5 h-5 text-slate-400"/>
          </h2>
          
          {(selectedPlan === 'Basic' || selectedPlan === 'Pro') && (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mb-6 flex items-start gap-3 cursor-pointer" onClick={() => setPremiumAddon(!premiumAddon)}>
              <input type="checkbox" checked={premiumAddon} onChange={() => {}} className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <div>
                <p className="font-bold text-indigo-900">Add Premium Alert Package (+₹150/mo)</p>
                <p className="text-sm text-indigo-700 mt-1">Unlock AI Insights, Voice Calls, and Unlimited SMS alerts for your {selectedPlan} plan.</p>
              </div>
            </div>
          )}"""
content = content.replace(old_form_head, new_form_head)

# Update the button text
old_button_text = "`Subscribe to ${selectedPlan} Plan (₹${selectedPlan === 'Ultra' ? '799' : selectedPlan === 'Pro' ? '399' : '199'}/mo)`"
new_button_text = "`Subscribe to ${selectedPlan} Plan (₹${selectedPlan === 'Ultra' ? '799' : selectedPlan === 'Pro' ? (premiumAddon ? 549 : 399) : (premiumAddon ? 349 : 199)}/mo)`"
content = content.replace(old_button_text, new_button_text)

# Update the Order History mapping
old_mapping = "order.num_containers === 1 ? 'Basic' : order.num_containers === 6 ? 'Ultra' : 'Pro'"
new_mapping = "order.num_containers === 1 ? 'Basic' : order.num_containers === 11 ? 'Basic + AI' : order.num_containers === 6 ? 'Ultra' : order.num_containers === 13 ? 'Pro + AI' : 'Pro'"
content = content.replace(old_mapping, new_mapping)

old_containers = "{order.num_containers} Compartments Hardware"
new_containers = "{order.num_containers > 10 ? order.num_containers - 10 : order.num_containers} Compartments Hardware"
content = content.replace(old_containers, new_containers)

with open("frontend/src/app/(dashboard)/orders/page.tsx", "w") as f:
    f.write(content)
print("Orders Page Patched")
