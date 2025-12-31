'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/review', label: 'Review Queue' },
    { href: '/admin/upload', label: 'Upload Data' },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="tab-navigation">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={'tab-btn ' + (pathname === item.href ? 'active' : '')}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}