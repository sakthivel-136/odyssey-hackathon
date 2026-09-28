with open("frontend/src/app/(dashboard)/orders/page.tsx", "r") as f:
    lines = f.readlines()

new_cards = """      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Basic Plan */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => setSelectedPlan('Basic')}
          className={`relative bg-white rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'Basic' ? 'border-blue-500 shadow-xl shadow-blue-200/50 scale-105' : 'border-slate-200 hover:border-blue-300'}`}
        >
          <div className="absolute top-0 right-0 p-6 opacity-20"><Shield className="w-16 h-16 text-slate-500" /></div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Basic</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-blue-600">₹4,500</span>
            <span className="text-slate-500 font-medium">One-Time</span>
          </div>
          <ul className="space-y-4 mb-8 text-slate-600 font-medium">
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> 1 Compartment Hardware</li>
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> Standard App Access</li>
            <li className="flex items-center gap-3 text-slate-400"><XCircle className="w-5 h-5"/> Features Require Add-on</li>
          </ul>
        </motion.div>

        {/* Pro Plan */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => setSelectedPlan('Pro')}
          className={`relative bg-white rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'Pro' ? 'border-blue-500 shadow-xl shadow-blue-200/50 scale-105 z-10' : 'border-slate-200 hover:border-blue-300'}`}
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg">Most Popular</div>
          <div className="absolute top-0 right-0 p-6 opacity-20"><Zap className="w-16 h-16 text-blue-500" /></div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Pro</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-blue-600">₹5,000</span>
            <span className="text-slate-500 font-medium">One-Time</span>
          </div>
          <ul className="space-y-4 mb-8 text-slate-600 font-medium">
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> 3 Compartments Hardware</li>
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> Standard App Access</li>
            <li className="flex items-center gap-3 text-slate-400"><XCircle className="w-5 h-5"/> Features Require Add-on</li>
          </ul>
        </motion.div>

        {/* Ultra Plan */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => setSelectedPlan('Ultra')}
          className={`relative bg-slate-900 rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'Ultra' ? 'border-purple-500 shadow-xl shadow-purple-500/30 scale-105' : 'border-slate-800 hover:border-slate-700'}`}
        >
          <div className="absolute top-0 right-0 p-6 opacity-20"><Crown className="w-16 h-16 text-purple-400" /></div>
          <h3 className="text-2xl font-black text-white mb-2">Ultra</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-purple-400">₹7,000</span>
            <span className="text-slate-400 font-medium">One-Time</span>
          </div>
          <ul className="space-y-4 mb-8 text-slate-300 font-medium">
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-purple-400"/> 6 Compartments Hardware</li>
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-purple-400"/> Standard App Access</li>
            <li className="flex items-center gap-3 text-slate-500"><XCircle className="w-5 h-5"/> Features Require Add-on</li>
          </ul>
        </motion.div>
      </div>\n"""

with open("frontend/src/app/(dashboard)/orders/page.tsx", "w") as f:
    f.writelines(lines[:100])
    f.write(new_cards)
    f.writelines(lines[162:])

print("Fixed pricing cards!")
