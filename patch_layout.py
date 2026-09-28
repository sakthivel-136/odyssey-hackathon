import re

with open("frontend/src/app/(dashboard)/layout.tsx", "r") as f:
    content = f.read()

old_admin_nav = """const ADMIN_NAV_ITEMS = [
  { href: '/admin/orders', label: 'View Orders', icon: PackageOpen },
  { href: '/admin/building', label: 'Building Process', icon: Wrench },
  { href: '/admin/history', label: 'Order History', icon: CheckCircle },
];"""

new_admin_nav = """const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Revenue Dashboard', icon: Activity },
  { href: '/admin/orders', label: 'View Orders', icon: PackageOpen },
  { href: '/admin/building', label: 'Building Process', icon: Wrench },
  { href: '/admin/history', label: 'Order History', icon: CheckCircle },
];"""

content = content.replace(old_admin_nav, new_admin_nav)

with open("frontend/src/app/(dashboard)/layout.tsx", "w") as f:
    f.write(content)
print("Layout Patched")
