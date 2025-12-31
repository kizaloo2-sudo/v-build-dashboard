'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type CaseType = 'REBUILD' | 'REPAIR'
type MaterialCategory = 'ROOF' | 'WALL' | 'DOOR_WINDOW' | 'ELECTRICAL' | 'PLUMBING' | 'PAINT'

interface Zone {
  id: string
  name: string
  gps_lat: number
  gps_lng: number
}

interface Household {
  id: string
  household_code: string
  head_of_household: string
  address: string
  zone_id: string
  family_size: number
  case_type: CaseType
  status: string
  priority: string
  progress: number
  damage_areas: string[]
  elderly_count: number
  children_count: number
  disabled_count: number
  zones?: { name: string }
}

interface Material {
  material_id: string
  material_name: string
  category: MaterialCategory
  unit: string
  total_demand: number
  total_donated: number
  still_need: number
}

interface Donation {
  id: string
  donor_name: string
  donor_type: string
  material_id: string
  quantity: number
  unit: string
  received_date: string
  materials?: { name: string }
}

interface ZoneData {
  zone: string
  total: number
  rebuild: number
  repair: number
}

const categoryLabels: Record<string, string> = {
  ROOF: 'หลังคา',
  WALL: 'ผนัง',
  DOOR_WINDOW: 'ประตู/หน้าต่าง',
  ELECTRICAL: 'ไฟฟ้า',
  PLUMBING: 'ประปา',
  PAINT: 'สี/ตกแต่ง',
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num)
}

function HorizontalBarChart({ data }: { data: ZoneData[] }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1)

  if (data.length === 0) return null

  return (
    <div className="horizontal-chart">
      {data.map((item) => {
        const rebuildPct = Math.round((item.rebuild / maxTotal) * 100)
        const repairPct = Math.round((item.repair / maxTotal) * 100)

        return (
          <div key={item.zone} className="chart-row">
            <div className="chart-label">{item.zone}</div>
            <div className="chart-bar-container">
              <div className="chart-bar-stack">
                {item.rebuild > 0 && (
                  <div className="chart-bar rebuild" data-width={rebuildPct}>
                    {item.rebuild}
                  </div>
                )}
                {item.repair > 0 && (
                  <div className="chart-bar repair" data-width={repairPct}>
                    {item.repair}
                  </div>
                )}
              </div>
              <span className="chart-total">{item.total}</span>
            </div>
          </div>
        )
      })}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot rebuild"></span>
          <span>Rebuild</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot repair"></span>
          <span>Repair</span>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState<Zone[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [donations, setDonations] = useState<Donation[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [zonesRes, householdsRes, materialsRes, donationsRes] = await Promise.all([
      supabase.from('zones').select('*'),
      supabase.from('households').select('*, zones(name)'),
      supabase.from('demand_summary').select('*'),
      supabase.from('donations').select('*, materials(name)').order('received_date', { ascending: false })
    ])

    if (zonesRes.data) setZones(zonesRes.data)
    if (householdsRes.data) setHouseholds(householdsRes.data)
    if (materialsRes.data) setMaterials(materialsRes.data)
    if (donationsRes.data) setDonations(donationsRes.data)
    setLoading(false)
  }

  if (loading) return null

  const totalHouseholds = households.length
  const rebuildCount = households.filter(h => h.case_type === 'REBUILD').length
  const repairCount = households.filter(h => h.case_type === 'REPAIR').length
  const completedCount = households.filter(h => h.status === 'เสร็จแล้ว').length

  const totalDemand = materials.reduce((sum, m) => sum + (m.total_demand || 0), 0)
  const totalDonated = materials.reduce((sum, m) => sum + (m.total_donated || 0), 0)

  const zoneData: ZoneData[] = zones.map(zone => {
    const zh = households.filter(h => h.zone_id === zone.id)
    return {
      zone: zone.name,
      total: zh.length,
      rebuild: zh.filter(h => h.case_type === 'REBUILD').length,
      repair: zh.filter(h => h.case_type === 'REPAIR').length,
    }
  }).sort((a, b) => b.total - a.total)

  const criticalShortages = [...materials]
    .filter(m => m.still_need > 0)
    .sort((a, b) => b.still_need - a.still_need)
    .slice(0, 4)

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="tab-navigation">
          <button className={'tab-btn ' + (activeTab === 'overview' ? 'active' : '')} onClick={() => setActiveTab('overview')}>ภาพรวม</button>
          <button className={'tab-btn ' + (activeTab === 'households' ? 'active' : '')} onClick={() => setActiveTab('households')}>ครัวเรือน</button>
          <button className={'tab-btn ' + (activeTab === 'materials' ? 'active' : '')} onClick={() => setActiveTab('materials')}>วัสดุ</button>
          <button className={'tab-btn ' + (activeTab === 'donors' ? 'active' : '')} onClick={() => setActiveTab('donors')}>ผู้บริจาค</button>
        </div>

        {activeTab === 'overview' && (
          <div className="animate-fadeIn">
            <div className="hero-stats">
              <div className="hero-card">
                <div className="hero-label">Total Households</div>
                <div className="hero-value">{formatNumber(totalHouseholds)}</div>
                <div className="hero-subtitle">ครัวเรือนทั้งหมด</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Rebuild Cases</div>
                <div className="hero-value">{formatNumber(rebuildCount)}</div>
                <div className="hero-subtitle">สร้างใหม่</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Repair Cases</div>
                <div className="hero-value">{formatNumber(repairCount)}</div>
                <div className="hero-subtitle">ซ่อมแซม</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Completed</div>
                <div className="hero-value">{formatNumber(completedCount)}</div>
                <div className="hero-subtitle">เสร็จสิ้นแล้ว</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Recovery Zone Distribution</div>
              </div>
              <div className="card-body">
                <Map />
              </div>
            </div>

            <div className="card urgent-section">
              <div className="card-header">
                <div className="card-title">วัสดุที่ต้องการเร่งด่วน</div>
              </div>
              <div className="card-body">
                <div className="hero-stats">
                  {criticalShortages.map(m => (
                    <div key={m.material_id} className="hero-card">
                      <div className="hero-label">{m.material_name}</div>
                      <div className="hero-value">{formatNumber(m.still_need)}</div>
                      <div className="hero-subtitle">หน่วย: {m.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'households' && (
          <div className="animate-fadeIn">
            <div className="hero-stats">
              <div className="hero-card">
                <div className="hero-label">Total Cases</div>
                <div className="hero-value">{formatNumber(totalHouseholds)}</div>
                <div className="hero-subtitle">ครัวเรือนทั้งหมด</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Rebuild</div>
                <div className="hero-value">{formatNumber(rebuildCount)}</div>
                <div className="hero-subtitle">สร้างใหม่</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Repair</div>
                <div className="hero-value">{formatNumber(repairCount)}</div>
                <div className="hero-subtitle">ซ่อมแซม</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Completed</div>
                <div className="hero-value">{formatNumber(completedCount)}</div>
                <div className="hero-subtitle">เสร็จสิ้นแล้ว</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Cases by Zone</div>
              </div>
              <div className="card-body">
                <HorizontalBarChart data={zoneData} />
              </div>
            </div>

            <div className="table-container">
              <div className="card-header">
                <div className="card-title">All Households</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ชื่อ</th>
                    <th>ประเภท</th>
                    <th>สถานะ</th>
                    <th className="hide-mobile">พื้นที่</th>
                    <th className="hide-mobile">Progress</th>
                    <th className="hide-mobile">รหัส</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map(h => (
                    <tr key={h.id}>
                      <td>{h.head_of_household}</td>
                      <td>
                        <span className={'type-badge ' + (h.case_type?.toLowerCase() || '')}>
                          {h.case_type}
                        </span>
                      </td>
                      <td><span className="status-badge">{h.status}</span></td>
                      <td className="hide-mobile">{h.zones?.name || '-'}</td>
                      <td className="hide-mobile">{h.progress}%</td>
                      <td className="hide-mobile">{h.household_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="animate-fadeIn">
            <div className="hero-stats">
              <div className="hero-card">
                <div className="hero-label">Total Demand</div>
                <div className="hero-value">{formatNumber(totalDemand)}</div>
                <div className="hero-subtitle">รายการทั้งหมด</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Total Donated</div>
                <div className="hero-value">{formatNumber(totalDonated)}</div>
                <div className="hero-subtitle">ได้รับบริจาค</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Still Needed</div>
                <div className="hero-value">{formatNumber(totalDemand - totalDonated)}</div>
                <div className="hero-subtitle">ยังขาดอยู่</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Fulfillment</div>
                <div className="hero-value">{totalDemand > 0 ? Math.round((totalDonated / totalDemand) * 100) : 0}%</div>
                <div className="hero-subtitle">ความคืบหน้า</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Material Inventory</div>
              </div>
              <div className="card-body">
                <div className="material-grid">
                  {materials.map(m => {
                    const pct = m.total_demand > 0 ? Math.round((m.total_donated / m.total_demand) * 100) : 0
                    return (
                      <div key={m.material_id} className="material-card">
                        <div className="material-header">
                          <div className="material-name">{m.material_name}</div>
                          <span className="material-badge">{categoryLabels[m.category] || m.category}</span>
                        </div>
                        <div className="material-stats">
                          <div>
                            <div className="material-stat-label">Demand</div>
                            <div className="material-stat-value">{formatNumber(m.total_demand)}</div>
                          </div>
                          <div>
                            <div className="material-stat-label">Donated</div>
                            <div className="material-stat-value">{formatNumber(m.total_donated)}</div>
                          </div>
                          <div>
                            <div className="material-stat-label">Still Need</div>
                            <div className="material-stat-value blue">{formatNumber(m.still_need)}</div>
                          </div>
                          <div>
                            <div className="material-stat-label">Progress</div>
                            <div className="material-stat-value">{pct}%</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'donors' && (
          <div className="animate-fadeIn">
            <div className="hero-stats">
              <div className="hero-card">
                <div className="hero-label">Total Donations</div>
                <div className="hero-value">{donations.length}</div>
                <div className="hero-subtitle">รายการบริจาค</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Organizations</div>
                <div className="hero-value">{donations.filter(d => d.donor_type === 'organization').length}</div>
                <div className="hero-subtitle">องค์กร/บริษัท</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Government</div>
                <div className="hero-value">{donations.filter(d => d.donor_type === 'government').length}</div>
                <div className="hero-subtitle">ภาครัฐ</div>
              </div>
              <div className="hero-card">
                <div className="hero-label">Individuals</div>
                <div className="hero-value">{donations.filter(d => d.donor_type === 'individual').length}</div>
                <div className="hero-subtitle">บุคคลทั่วไป</div>
              </div>
            </div>

            <div className="table-container">
              <div className="card-header">
                <div className="card-title">Recent Donations</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ผู้บริจาค</th>
                    <th>วัสดุ</th>
                    <th>จำนวน</th>
                    <th className="hide-mobile">ประเภท</th>
                    <th className="hide-mobile">วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map(d => (
                    <tr key={d.id}>
                      <td>{d.donor_name}</td>
                      <td>{d.materials?.name || '-'}</td>
                      <td>{formatNumber(d.quantity)} {d.unit}</td>
                      <td className="hide-mobile">{d.donor_type === 'organization' ? 'องค์กร' : d.donor_type === 'government' ? 'ภาครัฐ' : 'บุคคล'}</td>
                      <td className="hide-mobile">{new Date(d.received_date).toLocaleDateString('th-TH')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}