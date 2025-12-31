'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Household {
  id: string
  household_code: string
  head_of_household: string
  address: string
  family_size: number
  case_type: 'REBUILD' | 'REPAIR'
  status: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  progress: number
  damage_areas: string[]
  elderly_count: number
  children_count: number
  disabled_count: number
  admin_approved: boolean
  zones?: { name: string }
}

interface Material {
  id: string
  name: string
  category: string
  unit: string
}

interface RebuildSuggestion {
  type: 'REBUILD'
  model: string
  modelName: string
}

interface RepairSuggestion {
  type: 'REPAIR'
  damageAreas: string[]
  materials: { name: string; qty: number; unit: string }[]
}

type AISuggestion = RebuildSuggestion | RepairSuggestion

const damageLabels: Record<string, string> = {
  TOTAL_LOSS: 'พังทั้งหลัง',
  ROOF: 'หลังคา',
  WALL: 'ผนัง',
  DOOR_WINDOW: 'ประตู/หน้าต่าง',
  ELECTRICAL: 'ไฟฟ้า',
  PLUMBING: 'ประปา',
  PAINT: 'สี/ตกแต่ง'
}

const modelNames: Record<string, string> = {
  'SIZE-S': 'บ้านขนาดเล็ก (24 ตร.ม.)',
  'SIZE-M': 'บ้านขนาดกลาง (48 ตร.ม.)',
  'SIZE-L': 'บ้านขนาดใหญ่ (64 ตร.ม.)',
  'SIZE-XL': 'บ้านขนาดใหญ่พิเศษ (80 ตร.ม.)'
}

export default function ReviewQueue() {
  const [households, setHouseholds] = useState<Household[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [selectedCase, setSelectedCase] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [householdsRes, materialsRes] = await Promise.all([
      supabase.from('households').select('*, zones(name)').order('priority'),
      supabase.from('materials').select('*')
    ])
    if (householdsRes.data) setHouseholds(householdsRes.data)
    if (materialsRes.data) setMaterials(materialsRes.data)
    setLoading(false)
  }

  async function handleApprove(id: string) {
    await supabase
      .from('households')
      .update({ admin_approved: true, approved_at: new Date().toISOString() })
      .eq('id', id)
    fetchData()
    setSelectedCase(null)
  }

  async function handleReject(id: string) {
    await supabase
      .from('households')
      .update({ admin_approved: false, status: 'ถูกปฏิเสธ' })
      .eq('id', id)
    fetchData()
    setSelectedCase(null)
  }

  function getAISuggestion(h: Household): AISuggestion {
    if (h.case_type === 'REBUILD') {
      let model = 'SIZE-M'
      if (h.family_size <= 2) model = 'SIZE-S'
      else if (h.family_size <= 4) model = 'SIZE-M'
      else if (h.family_size <= 6) model = 'SIZE-L'
      else model = 'SIZE-XL'
      return { type: 'REBUILD', model, modelName: modelNames[model] }
    } else {
      const mats = h.damage_areas.flatMap(area => 
        materials.filter(m => m.category === area).slice(0, 2).map(m => ({
          name: m.name,
          qty: Math.floor(Math.random() * 15) + 5,
          unit: m.unit
        }))
      )
      return { type: 'REPAIR', damageAreas: h.damage_areas, materials: mats.slice(0, 6) }
    }
  }

  const pendingCount = households.filter(h => !h.admin_approved && h.status !== 'เสร็จแล้ว' && h.status !== 'ถูกปฏิเสธ').length
  const approvedCount = households.filter(h => h.admin_approved).length
  const rejectedCount = households.filter(h => h.status === 'ถูกปฏิเสธ').length

  const filteredHouseholds = households.filter(h => {
    if (filter === 'pending') return !h.admin_approved && h.status !== 'เสร็จแล้ว' && h.status !== 'ถูกปฏิเสธ'
    if (filter === 'approved') return h.admin_approved
    if (filter === 'rejected') return h.status === 'ถูกปฏิเสธ'
    return true
  })

  if (loading) {
    return <div className="animate-fadeIn"><div className="card"><div className="card-body">Loading...</div></div></div>
  }

  return (
    <div className="animate-fadeIn">
      <div className="hero-stats">
        <div 
          className={'hero-card clickable ' + (filter === 'pending' ? 'highlight-orange' : '')}
          onClick={() => setFilter('pending')}
        >
          <div className="hero-label">Pending</div>
          <div className="hero-value">{pendingCount}</div>
          <div className="hero-subtitle">รอตรวจสอบ</div>
        </div>
        <div 
          className={'hero-card clickable ' + (filter === 'approved' ? 'highlight-green' : '')}
          onClick={() => setFilter('approved')}
        >
          <div className="hero-label">Approved</div>
          <div className="hero-value">{approvedCount}</div>
          <div className="hero-subtitle">อนุมัติแล้ว</div>
        </div>
        <div 
          className={'hero-card clickable ' + (filter === 'rejected' ? 'highlight-red' : '')}
          onClick={() => setFilter('rejected')}
        >
          <div className="hero-label">Rejected</div>
          <div className="hero-value">{rejectedCount}</div>
          <div className="hero-subtitle">ถูกปฏิเสธ</div>
        </div>
        <div 
          className={'hero-card clickable ' + (filter === 'all' ? 'highlight-blue' : '')}
          onClick={() => setFilter('all')}
        >
          <div className="hero-label">All Cases</div>
          <div className="hero-value">{households.length}</div>
          <div className="hero-subtitle">ทั้งหมด</div>
        </div>
      </div>

      <div className="table-container">
        <div className="card-header">
          <div className="card-title">
            {filter === 'pending' ? 'Pending Review' : 
             filter === 'approved' ? 'Approved Cases' : 
             filter === 'rejected' ? 'Rejected Cases' : 'All Cases'}
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Zone</th>
              <th>Type</th>
              <th>Priority</th>
              <th>AI Suggestion</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredHouseholds.map(h => {
              const ai = getAISuggestion(h)
              return (
                <tr key={h.id} className="clickable-row" onClick={() => setSelectedCase(h)}>
                  <td className="code-cell">{h.household_code}</td>
                  <td>
                    <div className="name-cell">{h.head_of_household}</div>
                    <div className="sub-cell">{h.family_size} members</div>
                  </td>
                  <td>{h.zones?.name || '-'}</td>
                  <td><span className={'type-badge ' + h.case_type.toLowerCase()}>{h.case_type}</span></td>
                  <td><span className={'priority-badge ' + h.priority.toLowerCase()}>{h.priority}</span></td>
                  <td className="ai-cell">
                    {ai.type === 'REBUILD' ? ai.model : h.damage_areas.length + ' areas'}
                  </td>
                  <td>
                    {h.admin_approved ? (
                      <span className="status-approved">Approved</span>
                    ) : h.status === 'ถูกปฏิเสธ' ? (
                      <span className="status-rejected">Rejected</span>
                    ) : (
                      <span className="status-pending">{h.status}</span>
                    )}
                  </td>
                  <td>
                    {!h.admin_approved && h.status !== 'ถูกปฏิเสธ' && (
                      <div className="action-buttons">
                        <button 
                          className="btn-approve"
                          onClick={(e) => { e.stopPropagation(); handleApprove(h.id) }}
                        >Approve</button>
                        <button 
                          className="btn-reject"
                          onClick={(e) => { e.stopPropagation(); handleReject(h.id) }}
                        >Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredHouseholds.length === 0 && (
          <div className="empty-state">No cases in this category</div>
        )}
      </div>

      {selectedCase && (
        <CaseModal 
          household={selectedCase}
          ai={getAISuggestion(selectedCase)}
          onClose={() => setSelectedCase(null)}
          onApprove={() => handleApprove(selectedCase.id)}
          onReject={() => handleReject(selectedCase.id)}
        />
      )}
    </div>
  )
}

function CaseModal({ 
  household, 
  ai, 
  onClose, 
  onApprove, 
  onReject 
}: { 
  household: Household
  ai: AISuggestion
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const isRejected = household.status === 'ถูกปฏิเสธ'
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-code">{household.household_code}</div>
            <h2 className="modal-title">{household.head_of_household}</h2>
            <p className="modal-zone">{household.zones?.name || household.address}</p>
          </div>
          <div className="modal-badges">
            <span className={'type-badge ' + household.case_type.toLowerCase()}>{household.case_type}</span>
            <span className={'priority-badge ' + household.priority.toLowerCase()}>{household.priority}</span>
          </div>
        </div>

        <div className="modal-body">
          <div className="info-grid">
            <div className="info-box">
              <div className="info-label">Members</div>
              <div className="info-value">{household.family_size}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Elderly</div>
              <div className="info-value">{household.elderly_count}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Children</div>
              <div className="info-value">{household.children_count}</div>
            </div>
            <div className="info-box">
              <div className="info-label">Disabled</div>
              <div className="info-value">{household.disabled_count}</div>
            </div>
          </div>

          <div className="ai-suggestion-box">
            <div className="ai-header">AI Recommendation</div>
            {ai.type === 'REBUILD' ? (
              <div className="ai-content">
                <div className="ai-row">
                  <span className="ai-label">Recommended Model</span>
                  <span className="ai-value">{ai.modelName}</span>
                </div>
                <div className="ai-row">
                  <span className="ai-label">Reason</span>
                  <span className="ai-value">Family of {household.family_size} members</span>
                </div>
              </div>
            ) : (
              <div className="ai-content">
                <div className="ai-row">
                  <span className="ai-label">Damage Areas</span>
                  <span className="ai-value">{ai.damageAreas.map(a => damageLabels[a] || a).join(', ')}</span>
                </div>
                <div className="ai-materials">
                  <div className="ai-label">Required Materials</div>
                  {ai.materials.map((m, i) => (
                    <div key={i} className="material-row">
                      <span>{m.name}</span>
                      <span>{m.qty} {m.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="progress-section">
            <div className="progress-label">Current Progress: {household.progress}%</div>
          </div>
        </div>

        <div className="modal-footer">
          {household.admin_approved ? (
            <div className="approved-badge">This case has been approved</div>
          ) : isRejected ? (
            <div className="rejected-badge">This case has been rejected</div>
          ) : (
            <>
              <button className="btn-approve-lg" onClick={onApprove}>Approve Case</button>
              <button className="btn-reject-lg" onClick={onReject}>Reject</button>
            </>
          )}
        </div>

        <button className="modal-close" onClick={onClose}>×</button>
      </div>
    </div>
  )
}