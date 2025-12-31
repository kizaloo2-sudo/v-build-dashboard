'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num)
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalHouseholds: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const { data } = await supabase.from('households').select('*')
    if (data) {
      setStats({
        totalHouseholds: data.length,
        pendingReview: data.filter(h => !h.admin_approved && h.status !== 'เสร็จแล้ว' && h.status !== 'ถูกปฏิเสธ').length,
        approved: data.filter(h => h.admin_approved).length,
        rejected: data.filter(h => h.status === 'ถูกปฏิเสธ').length
      })
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="hero-stats">
          <div className="hero-card"><div className="hero-label">Loading...</div></div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="hero-stats">
        <div className="hero-card">
          <div className="hero-label">Total Cases</div>
          <div className="hero-value">{formatNumber(stats.totalHouseholds)}</div>
          <div className="hero-subtitle">เคสทั้งหมด</div>
        </div>
        <div className="hero-card highlight-orange">
          <div className="hero-label">Pending</div>
          <div className="hero-value">{formatNumber(stats.pendingReview)}</div>
          <div className="hero-subtitle">รอตรวจสอบ</div>
        </div>
        <div className="hero-card highlight-green">
          <div className="hero-label">Approved</div>
          <div className="hero-value">{formatNumber(stats.approved)}</div>
          <div className="hero-subtitle">อนุมัติแล้ว</div>
        </div>
        <div className="hero-card highlight-red">
          <div className="hero-label">Rejected</div>
          <div className="hero-value">{formatNumber(stats.rejected)}</div>
          <div className="hero-subtitle">ถูกปฏิเสธ</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Quick Actions</div>
        </div>
        <div className="card-body">
          <div className="action-grid">
            <a href="/admin/review" className="action-card">
              <div className="action-title">Review Queue</div>
              <div className="action-desc">{stats.pendingReview} cases pending</div>
            </a>
            <a href="/admin/upload" className="action-card">
              <div className="action-title">Upload Data</div>
              <div className="action-desc">Import from Excel/CSV</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}