import { useState, useEffect } from 'react'
import { Plus, X, ChevronRight, Trash2, Settings2, Pencil, Loader2 } from 'lucide-react'
import { db } from '../firebase'
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  limit
} from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardDescription } from '@/components/ui/card'
import CalendarView from './CalendarView'

function FriendDetailView({ friend, onBack }) {
  const [logs, setLogs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFriendLogs = async () => {
      try {
        const q = query(collection(db, 'reading_logs'), where('user_id', '==', friend.id))
        const snapshot = await getDocs(q)
        const logsMap = {}
        snapshot.docs.forEach((docItem) => {
          const log = { id: docItem.id, ...docItem.data() }
          const d = log.date
          if (!logsMap[d]) logsMap[d] = []
          logsMap[d].push(log)
        })
        setLogs(logsMap)
      } catch (err) {
        console.error('Error fetching friend logs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFriendLogs()
  }, [friend])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{friend.name} Takibi</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : (
        <CalendarView logs={logs} />
      )}
    </div>
  )
}

export default function FriendsView({ userId }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState('')

  const [showEditGroup, setShowEditGroup] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [editGroupNameInput, setEditGroupNameInput] = useState('')

  const [activeGroupId, setActiveGroupId] = useState(null)
  const [memberIdInput, setMemberIdInput] = useState('')

  const [selectedFriend, setSelectedFriend] = useState(null)
  const [movingMember, setMovingMember] = useState(null)

  useEffect(() => {
    if (!userId) return

    const q = query(collection(db, 'following_groups'), where('user_id', '==', userId))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const groupsData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data()
        }))
        setGroups(groupsData)
        setLoading(false)
      },
      (error) => {
        console.error('Error listening to following_groups:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  const handleAddGroup = async () => {
    if (!groupNameInput.trim()) return
    try {
      await addDoc(collection(db, 'following_groups'), {
        user_id: userId,
        name: groupNameInput.trim(),
        members: []
      })
      setGroupNameInput('')
      setShowAddGroup(false)
    } catch (err) {
      console.error(err)
      alert('Grup eklenirken hata oluştu.')
    }
  }

  const handleAddMember = async () => {
    if (!memberIdInput.trim()) return
    try {
      const q = query(
        collection(db, 'users'),
        where('public_id', '==', memberIdInput.trim().toUpperCase()),
        limit(1)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        alert('Böyle bir Kullanıcı ID bulunamadı.')
        return
      }

      const foundUser = snapshot.docs[0].data()
      const realMemberId = foundUser.id || snapshot.docs[0].id
      const name = foundUser.name || `Öğrenci ${memberIdInput}`

      const targetGroup = groups.find((g) => g.id === activeGroupId)
      if (!targetGroup) return
      const currentMembers = targetGroup.members || []

      if (currentMembers.find((m) => m.id === realMemberId)) {
        alert('Zaten ekli.')
        return
      }

      const newMembers = [...currentMembers, { id: realMemberId, name, public_id: foundUser.public_id }]
      await updateDoc(doc(db, 'following_groups', activeGroupId), { members: newMembers })

      setMemberIdInput('')
      setActiveGroupId(null)
    } catch (err) {
      console.error(err)
      alert('Üye eklenirken hata oluştu.')
    }
  }

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Bu grubu silmek istiyor musun?')) return
    try {
      await deleteDoc(doc(db, 'following_groups', groupId))
    } catch (err) {
      console.error(err)
      alert('Grup silinirken hata oluştu.')
    }
  }

  const handleEditGroup = async () => {
    if (!editGroupNameInput.trim() || !editingGroupId) return
    try {
      await updateDoc(doc(db, 'following_groups', editingGroupId), { name: editGroupNameInput.trim() })
      setShowEditGroup(false)
      setEditingGroupId(null)
      setEditGroupNameInput('')
    } catch (err) {
      console.error(err)
      alert('Grup düzenlenirken hata oluştu.')
    }
  }

  const openEditGroup = (group) => {
    setEditingGroupId(group.id)
    setEditGroupNameInput(group.name)
    setShowEditGroup(true)
  }

  const handleRemoveMember = async (groupId, member) => {
    if (!window.confirm(`${member.name} isimli kişiyi gruptan çıkarmak istiyor musun?`)) return
    try {
      const group = groups.find((g) => g.id === groupId)
      if (!group) return
      const newMembers = (group.members || []).filter((m) => m.id !== member.id)
      await updateDoc(doc(db, 'following_groups', groupId), { members: newMembers })
    } catch (err) {
      console.error(err)
      alert('Üye çıkarılırken hata oluştu.')
    }
  }

  const handleMoveMember = async (targetGroupId) => {
    if (!movingMember || !targetGroupId) return
    const { member, currentGroupId } = movingMember

    try {
      const sourceGroup = groups.find((g) => g.id === currentGroupId)
      const filteredMembers = (sourceGroup?.members || []).filter((m) => m.id !== member.id)

      const targetGroup = groups.find((g) => g.id === targetGroupId)
      const updatedTargetMembers = [...(targetGroup?.members || []), member]

      await Promise.all([
        updateDoc(doc(db, 'following_groups', currentGroupId), { members: filteredMembers }),
        updateDoc(doc(db, 'following_groups', targetGroupId), { members: updatedTargetMembers })
      ])

      setMovingMember(null)
    } catch (err) {
      console.error(err)
      alert('Üye taşınırken hata oluştu.')
    }
  }

  if (selectedFriend) {
    return <FriendDetailView friend={selectedFriend} onBack={() => setSelectedFriend(null)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Takip</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddGroup(true)}
          className="text-teal-600 border-teal-200 hover:bg-teal-50"
        >
          <Plus className="mr-2 h-4 w-4" /> Grup Ekle
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card className="p-10 text-center bg-slate-50/50 border-dashed">
          <CardDescription className="mb-4 text-base">Henüz hiç grup oluşturmadın. Talebelerini gruplara ayırarak takibini kolaylaştırabilirsin.</CardDescription>
          <Button onClick={() => setShowAddGroup(true)} className="mx-auto">Grup Oluştur</Button>
        </Card>
      )}

      {groups.map((group) => (
        <div key={group.id} className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-800">{group.name}</h3>
              <button
                onClick={() => openEditGroup(group)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Grubu Düzenle"
              >
                <Pencil size={14} />
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveGroupId(group.id)}
                className="h-8 text-xs font-semibold px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none"
              >
                + Talebe Ekle
              </Button>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="p-1 text-red-300 hover:text-red-500 transition-colors"
                title="Grubu Sil"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            {group.members && group.members.length > 0 ? (
              group.members.map((member) => (
                <Card
                  key={member.id}
                  className="p-3 hover:shadow-md transition-all cursor-pointer border-slate-100"
                  onClick={() => setSelectedFriend(member)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200">
                      {member.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{member.name}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMovingMember({ member, currentGroupId: group.id })
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Grubu Değiştir"
                      >
                        <Settings2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMember(group.id, member)
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Gruptan Çıkar"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} className="text-slate-300 ml-1" />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 text-center">
                Bu grupta henüz kimse yok.
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Modals */}
      {showAddGroup && (
        <div className="modal-overlay" onClick={() => setShowAddGroup(false)}>
          <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Yeni Grup Oluştur</h3>
              <button onClick={() => setShowAddGroup(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="group-name">Grup Adı</Label>
                <Input
                  id="group-name"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="örn: Liseli Talebeler"
                  autoFocus
                  className="text-left h-11"
                />
              </div>
              <Button className="w-full h-11" onClick={handleAddGroup}>Oluştur</Button>
            </div>
          </Card>
        </div>
      )}

      {showEditGroup && (
        <div className="modal-overlay" onClick={() => { setShowEditGroup(false); setEditingGroupId(null); setEditGroupNameInput('') }}>
          <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Grubu Düzenle</h3>
              <button onClick={() => { setShowEditGroup(false); setEditingGroupId(null); setEditGroupNameInput('') }} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-group-name">Yeni Grup Adı</Label>
                <Input
                  id="edit-group-name"
                  value={editGroupNameInput}
                  onChange={(e) => setEditGroupNameInput(e.target.value)}
                  placeholder="Grup Adı"
                  autoFocus
                  className="text-left h-11"
                />
              </div>
              <Button className="w-full h-11" onClick={handleEditGroup}>Kaydet</Button>
            </div>
          </Card>
        </div>
      )}

      {activeGroupId && (
        <div className="modal-overlay" onClick={() => setActiveGroupId(null)}>
          <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Talebe Ekle</h3>
              <button onClick={() => setActiveGroupId(null)} className="text-slate-400"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">Eklemek istediğin kişinin profilindeki benzersiz <b>Kullanıcı ID</b>'sini (örn: TR1234X5678) gir.</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="member-id">Kullanıcı ID</Label>
                <Input
                  id="member-id"
                  value={memberIdInput}
                  onChange={(e) => setMemberIdInput(e.target.value)}
                  placeholder="TR...."
                  autoFocus
                  className="text-left h-11 tracking-wider font-mono font-bold uppercase"
                />
              </div>
              <Button className="w-full h-11" onClick={handleAddMember}>Gruba Ekle</Button>
            </div>
          </Card>
        </div>
      )}

      {movingMember && (
        <div className="modal-overlay" onClick={() => setMovingMember(null)}>
          <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Grubu Değiştir</h3>
              <button onClick={() => setMovingMember(null)} className="text-slate-400"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              <span className="font-bold text-slate-700">{movingMember.member.name}</span> isimli kişiyi hangi gruba taşımak istiyorsun?
            </p>
            <div className="grid gap-2">
              {groups.filter((g) => g.id !== movingMember.currentGroupId).length > 0 ? (
                groups.filter((g) => g.id !== movingMember.currentGroupId).map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleMoveMember(group.id)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 transition-all font-medium text-slate-700"
                  >
                    {group.name}
                  </button>
                ))
              ) : (
                <div className="p-4 bg-red-50 rounded-xl text-xs text-red-500 text-center border border-red-100">
                  Taşıyabileceğin başka bir grup bulunmuyor.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
