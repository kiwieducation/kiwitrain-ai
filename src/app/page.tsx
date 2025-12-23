'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

// ==================== SUPABASE CONFIG ====================
const supabaseUrl = 'https://ylrppnfncsxuynnzthum.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscnBwbmZuY3N4dXlubnp0aHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4NTM5NzAsImV4cCI6MjA1MDQyOTk3MH0.n7hDCCpSGfrKRDvFYaP7Oh6_eKAcPjBJF4WaL7Pltr0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== TYPES ====================
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department_id: string;
  password: string;
  password_changed: boolean;
  avatar_url?: string;
  custom_perms?: string[];
}

interface Department {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

interface TrainingPhase {
  id: string;
  department_id: string;
  name: string;
  description?: string;
  sort_order: number;
}

interface TrainingTask {
  id: string;
  module_id: string;
  title: string;
  task_type: string;
  is_self_complete: boolean;
  sort_order: number;
}

interface TrainingModule {
  id: string;
  department_id: string;
  title: string;
  day_number: number;
  duration?: string;
  phase_id?: string;
  sort_order: number;
  training_tasks?: TrainingTask[];
}

interface UserProgress {
  id: string;
  user_id: string;
  task_id: string;
  is_completed: boolean;
  completed_at?: string;
}

interface Resource {
  id: string;
  title: string;
  file_type: string;
  file_url: string;
  file_name?: string;
  created_at: string;
}

interface QuizQuestion {
  id: string;
  task_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answers: string[];
  sort_order: number;
}

// ==================== ROLES & PERMISSIONS ====================
const ROLES: Record<string, { label: string; color: string; bg: string; perms: string[] }> = {
  admin: { label: '管理员', color: '#dc2626', bg: '#fef2f2', perms: ['all'] },
  leader: { label: '组长', color: '#d97706', bg: '#fef3c7', perms: ['edit_training', 'upload_resources', 'view_team_progress', 'approve_homework'] },
  admin_staff: { label: '行政', color: '#7c3aed', bg: '#f3e8ff', perms: ['manage_users'] },
  employee: { label: '员工', color: '#6b7280', bg: '#f3f4f6', perms: [] }
};

const PERMISSIONS = [
  { key: 'edit_training', label: '编辑培训计划', desc: '创建、编辑、删除培训日和任务' },
  { key: 'upload_resources', label: '上传资料', desc: '上传和管理资料库文件' },
  { key: 'manage_users', label: '管理员工', desc: '添加、编辑、删除员工账号' },
  { key: 'view_team_progress', label: '查看团队进度', desc: '在Dashboard查看团队成员进度' },
  { key: 'approve_homework', label: '审批作业', desc: '审批团队成员提交的作业' },
];

const hasPerm = (user: User | null, perm: string): boolean => {
  if (!user || !ROLES[user.role]) return false;
  if (ROLES[user.role].perms.includes('all')) return true;
  if (user.custom_perms && Array.isArray(user.custom_perms)) {
    return user.custom_perms.includes(perm);
  }
  return ROLES[user.role].perms.includes(perm);
};

// ==================== ICONS ====================
const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Training: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Resources: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Logout: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Delete: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Check: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Chevron: ({ expanded }: { expanded: boolean }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}}><polyline points="6 9 12 15 18 9"/></svg>,
  Document: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Upload: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Building: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 12h2a2 2 0 0 1 2 2v8h-4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>,
  Task: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  UserCheck: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  Spinner: () => <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
};

// ==================== AUTH CONTEXT ====================
interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  showChangePassword: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
  handlePasswordChanged: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('kiwitrain_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);
        if (!user.password_changed) {
          setShowChangePassword(true);
        }
      } catch {
        localStorage.removeItem('kiwitrain_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().includes('@') ? email.toLowerCase() : email.toLowerCase() + '@mykiwiedu.com')
      .limit(1);
    
    if (error || !users || users.length === 0) {
      throw new Error('账号不存在');
    }
    
    const user = users[0] as User;
    if (user.password !== password) {
      throw new Error('密码错误');
    }
    
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('kiwitrain_user', JSON.stringify(user));
    
    if (!user.password_changed) {
      setShowChangePassword(true);
    }
    
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('kiwitrain_user');
  };

  const updateUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('kiwitrain_user', JSON.stringify(user));
  };

  const handlePasswordChanged = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('kiwitrain_user', JSON.stringify(user));
    setShowChangePassword(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoggedIn, loading, showChangePassword, login, logout, updateUser, handlePasswordChanged }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// ==================== LOGIN PAGE ====================
const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg, #f0fdfa 0%, #cffafe 100%)'}}>
      <div style={{backgroundColor:'white',borderRadius:'20px',boxShadow:'0 25px 50px -12px rgba(0,0,0,0.15)',padding:'40px',width:'100%',maxWidth:'420px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',marginBottom:'32px'}}>
          <div style={{width:'56px',height:'56px',borderRadius:'16px',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(13,148,136,0.3)'}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div style={{fontSize:'24px',fontWeight:'700',color:'#0d9488'}}>KiwiTrain AI</div>
            <div style={{fontSize:'12px',color:'#9ca3af'}}>柯维留学事务所培训系统</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:'500',color:'#374151'}}>邮箱账号</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="输入邮箱或用户名" style={{width:'100%',padding:'12px 16px',borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'14px',outline:'none'}} />
          </div>
          <div style={{marginBottom:'24px'}}>
            <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:'500',color:'#374151'}}>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入密码" style={{width:'100%',padding:'12px 16px',borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'14px',outline:'none'}} />
          </div>
          {error && <div style={{marginBottom:'16px',padding:'12px',backgroundColor:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:'12px',fontSize:'14px'}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontSize:'16px',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 12px rgba(13,148,136,0.3)'}}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div style={{marginTop:'24px',textAlign:'center',fontSize:'12px',color:'#9ca3af'}}>默认密码: 12345kiwi · 首次登录需修改密码</div>
      </div>
    </div>
  );
};

// ==================== CHANGE PASSWORD MODAL ====================
const ChangePasswordModal = ({ user, isForced = false, onComplete, onClose }: { user: User; isForced?: boolean; onComplete: (user: User) => void; onClose?: () => void }) => {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isForced && currentPwd !== user.password) { setError('当前密码错误'); return; }
    if (newPwd.length < 6) { setError('新密码至少6位'); return; }
    if (newPwd !== confirmPwd) { setError('两次密码不一致'); return; }
    if (newPwd === '12345kiwi') { setError('请设置一个不同于初始密码的新密码'); return; }

    setSaving(true);
    const { error: updateError } = await supabase.from('users').update({ password: newPwd, password_changed: true }).eq('id', user.id);
    if (updateError) { setError('修改失败，请重试'); setSaving(false); return; }
    onComplete({ ...user, password: newPwd, password_changed: true });
  };

  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'420px',maxHeight:'90vh',overflowY:'auto'}}>
        <h3 style={{margin:'0 0 8px',fontSize:'18px',fontWeight:'600'}}>{isForced ? '首次登录，请修改密码' : '修改密码'}</h3>
        {isForced && <p style={{fontSize:'12px',color:'#6b7280',marginBottom:'24px'}}>为了账号安全，请设置新密码</p>}
        <form onSubmit={handleSubmit}>
          {!isForced && (
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>当前密码</label>
              <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required />
            </div>
          )}
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>新密码</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="至少6位" style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required />
          </div>
          <div style={{marginBottom:'24px'}}>
            <label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>确认新密码</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required />
          </div>
          {error && <div style={{marginBottom:'16px',padding:'12px',backgroundColor:'#fef2f2',color:'#dc2626',borderRadius:'10px',fontSize:'14px'}}>{error}</div>}
          <div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}>
            {!isForced && onClose && <button type="button" onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button>}
            <button type="submit" disabled={saving} style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>{saving ? '保存中...' : '确认修改'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== SIDEBAR ====================
const Sidebar = ({ activeNav, setActiveNav }: { activeNav: string; setActiveNav: (nav: string) => void }) => {
  const { currentUser, logout } = useAuth();
  const canSeeDashboard = ['admin', 'admin_staff'].includes(currentUser?.role || '') || hasPerm(currentUser, 'view_team_progress');
  const canManageUsers = hasPerm(currentUser, 'manage_users') || hasPerm(currentUser, 'all');

  const navItems = [
    { id: 'dashboard', label: hasPerm(currentUser, 'view_team_progress') && !['admin', 'admin_staff'].includes(currentUser?.role || '') ? '团队进度' : '总览 Dashboard', icon: Icons.Dashboard, show: canSeeDashboard },
    { id: 'training', label: '培训计划 Training', icon: Icons.Training, show: true },
    { id: 'resources', label: '资料库 Resources', icon: Icons.Resources, show: true },
    { id: 'users', label: '账号管理 Users', icon: Icons.Users, show: canManageUsers },
  ].filter(item => item.show);

  return (
    <div style={{width:'240px',backgroundColor:'#ffffff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',position:'fixed',height:'100vh',zIndex:100}}>
      <div style={{padding:'20px 16px',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(13, 148, 136, 0.3)'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div><div style={{fontSize:'17px',fontWeight:'700',color:'#0d9488'}}>KiwiTrain AI</div><div style={{fontSize:'11px',color:'#9ca3af'}}>柯维留学事务所培训系统</div></div>
        </div>
      </div>
      <nav style={{padding:'16px 12px',flex:1}}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <div key={item.id} onClick={() => setActiveNav(item.id)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderRadius:'10px',marginBottom:'4px',cursor:'pointer',backgroundColor:isActive?'#f0fdfa':'transparent',color:isActive?'#0d9488':'#6b7280',fontWeight:isActive?'600':'500',fontSize:'14px',transition:'all 0.2s'}}>
              <Icon /><span>{item.label}</span>
            </div>
          );
        })}
      </nav>
      <div style={{padding:'16px',borderTop:'1px solid #f3f4f6'}}>
        <div onClick={() => setActiveNav('profile')} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px',borderRadius:'10px',cursor:'pointer',backgroundColor:activeNav==='profile'?'#f0fdfa':'transparent'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'10px',backgroundColor:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'600',overflow:'hidden'}}>
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : currentUser?.name?.[0] || 'A'}
          </div>
          <div style={{flex:1}}><div style={{fontSize:'14px',fontWeight:'600',color:'#1f2937'}}>{currentUser?.name || '用户'}</div><div style={{fontSize:'12px',color:ROLES[currentUser?.role||'']?.color||'#9ca3af'}}>{ROLES[currentUser?.role||'']?.label||'员工'}</div></div>
        </div>
        <div onClick={logout} style={{display:'flex',alignItems:'center',gap:'8px',color:'#ef4444',fontSize:'13px',cursor:'pointer',marginTop:'12px',padding:'8px',borderRadius:'8px'}}><Icons.Logout/><span>退出登录</span></div>
      </div>
    </div>
  );
};

// ==================== DASHBOARD ====================
const Dashboard = ({ departments }: { departments: Department[] }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<any>({ departmentStats: [] });
  const [employeesByDept, setEmployeesByDept] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const isLeader = currentUser?.role === 'leader';
  const leaderDeptId = currentUser?.department_id;
  const visibleDepartments = isLeader ? departments.filter(d => String(d.id) === String(leaderDeptId)) : departments;

  useEffect(() => {
    const fetchData = async () => {
      if (visibleDepartments.length === 0) return;
      const { data: modules } = await supabase.from('training_modules').select('*, training_tasks(*)').order('sort_order');
      const { data: users } = await supabase.from('users').select('*');
      const { data: progress } = await supabase.from('user_task_progress').select('*');

      const modsByDept: Record<string, any[]> = {};
      visibleDepartments.forEach(dept => { modsByDept[dept.id] = (modules || []).filter(m => String(m.department_id) === String(dept.id)); });

      const allTasks: any[] = [];
      modules?.forEach(m => { (m.training_tasks || []).forEach((t: any) => { allTasks.push({ ...t, department_id: String(m.department_id) }); }); });

      const deptStats: any[] = [];
      const empByDept: Record<string, any[]> = {};

      visibleDepartments.forEach(dept => {
        const deptIdStr = String(dept.id);
        const deptTasks = allTasks.filter(t => t.department_id === deptIdStr);
        const deptTaskIds = deptTasks.map(t => String(t.id));
        let deptUsers = users?.filter(u => String(u.department_id) === deptIdStr) || [];
        if (isLeader) deptUsers = deptUsers.filter(u => !['admin', 'admin_staff'].includes(u.role));

        const employeesWithProgress = deptUsers.map(user => {
          const completedTaskIds = (progress || []).filter(p => String(p.user_id) === String(user.id) && p.is_completed && deptTaskIds.includes(String(p.task_id))).map(p => String(p.task_id));
          const completedTasks = completedTaskIds.length;
          const totalTasks = deptTasks.length;
          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return { ...user, completedTasks, totalTasks, completionRate };
        }).sort((a, b) => b.completionRate - a.completionRate);

        empByDept[dept.id] = employeesWithProgress;
        const totalCompleted = employeesWithProgress.reduce((sum, emp) => sum + emp.completedTasks, 0);
        const totalPossible = deptUsers.length * deptTasks.length;
        const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
        deptStats.push({ department: dept, stats: { moduleCount: modsByDept[dept.id]?.length || 0, totalTasks: deptTasks.length, employeeCount: deptUsers.length, completionRate } });
      });

      setStats({ totalDepartments: visibleDepartments.length, totalModules: modules?.length || 0, totalTasks: allTasks.length, totalEmployees: users?.length || 0, departmentStats: deptStats });
      setEmployeesByDept(empByDept);
      setLoading(false);
    };
    fetchData();
  }, [visibleDepartments.length]);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px'}}><Icons.Spinner/><span style={{marginLeft:'12px',color:'#6b7280'}}>加载数据...</span></div>;

  const ProgressBar = ({ rate }: { rate: number }) => (
    <div style={{height:'6px',backgroundColor:'#e5e7eb',borderRadius:'3px',overflow:'hidden',flex:1}}>
      <div style={{height:'100%',borderRadius:'3px',width:`${rate}%`,backgroundColor:rate===100?'#10b981':rate>=60?'#0d9488':rate>=30?'#f59e0b':'#ef4444',transition:'width 0.3s'}}/>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:'24px'}}><div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}><Icons.Dashboard/><h1 style={{fontSize:'20px',fontWeight:'700',color:'#1f2937',margin:0}}>{isLeader?'团队进度':'总览 Dashboard'}</h1></div><p style={{fontSize:'14px',color:'#6b7280',margin:0}}>{isLeader?'查看团队成员的培训进度':'查看公司培训整体情况与员工学习进度'}</p></div>
      <div style={{display:'grid',gridTemplateColumns:isLeader?'repeat(3,1fr)':'repeat(4,1fr)',gap:'16px',marginBottom:'24px'}}>
        {!isLeader && <div style={{backgroundColor:'white',borderRadius:'12px',padding:'20px',border:'1px solid #e5e7eb'}}><div style={{fontSize:'12px',color:'#6b7280',marginBottom:'4px'}}>部门总数</div><div style={{fontSize:'28px',fontWeight:'700',color:'#1f2937'}}>{stats.totalDepartments}</div></div>}
        <div style={{backgroundColor:'white',borderRadius:'12px',padding:'20px',border:'1px solid #e5e7eb'}}><div style={{fontSize:'12px',color:'#6b7280',marginBottom:'4px'}}>培训模块</div><div style={{fontSize:'28px',fontWeight:'700',color:'#1f2937'}}>{stats.totalModules}</div></div>
        <div style={{backgroundColor:'white',borderRadius:'12px',padding:'20px',border:'1px solid #e5e7eb'}}><div style={{fontSize:'12px',color:'#6b7280',marginBottom:'4px'}}>培训任务</div><div style={{fontSize:'28px',fontWeight:'700',color:'#1f2937'}}>{stats.totalTasks}</div></div>
        <div style={{backgroundColor:'white',borderRadius:'12px',padding:'20px',border:'1px solid #e5e7eb'}}><div style={{fontSize:'12px',color:'#6b7280',marginBottom:'4px'}}>{isLeader?'团队成员':'员工人数'}</div><div style={{fontSize:'28px',fontWeight:'700',color:'#1f2937'}}>{stats.totalEmployees}</div></div>
      </div>
      <div style={{backgroundColor:'white',borderRadius:'12px',padding:'20px',border:'1px solid #e5e7eb'}}>
        <h2 style={{fontSize:'16px',fontWeight:'600',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}><Icons.Building/>{isLeader?'团队成员培训进度':'部门培训进度'}</h2>
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {stats.departmentStats.map((item: any, i: number) => {
            const isExpanded = expandedDepts[item.department.id];
            const deptEmployees = employeesByDept[item.department.id] || [];
            return (
              <div key={i} style={{border:'1px solid #e5e7eb',borderRadius:'12px',overflow:'hidden'}}>
                <div onClick={() => setExpandedDepts(prev => ({...prev, [item.department.id]: !prev[item.department.id]}))} style={{padding:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',backgroundColor:isExpanded?'#f0fdfa':'#f9fafb'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'8px',backgroundColor:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'600'}}>{item.department.name[0]}</div>
                    <div><div style={{fontWeight:'600',fontSize:'14px'}}>{item.department.name}</div><div style={{fontSize:'12px',color:'#6b7280'}}>👥 {item.stats.employeeCount} 员工 · 📚 {item.stats.moduleCount} 模块 · 📋 {item.stats.totalTasks} 任务</div></div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',width:'140px'}}><ProgressBar rate={item.stats.completionRate}/><span style={{fontSize:'12px',fontWeight:'600',padding:'2px 8px',borderRadius:'20px',backgroundColor:item.stats.completionRate===100?'#d1fae5':item.stats.completionRate>=60?'#ccfbf1':'#fef3c7',color:item.stats.completionRate===100?'#059669':item.stats.completionRate>=60?'#0d9488':'#d97706'}}>{item.stats.completionRate}%</span></div>
                    <Icons.Chevron expanded={isExpanded}/>
                  </div>
                </div>
                {isExpanded && deptEmployees.length > 0 && (
                  <div style={{padding:'16px',borderTop:'1px solid #e5e7eb',backgroundColor:'white'}}>
                    {deptEmployees.map((emp: any) => (
                      <div key={emp.id} style={{display:'flex',alignItems:'center',padding:'12px',backgroundColor:'#f9fafb',borderRadius:'8px',marginBottom:'8px'}}>
                        <div style={{width:'32px',height:'32px',borderRadius:'8px',backgroundColor:'#ccfbf1',display:'flex',alignItems:'center',justifyContent:'center',color:'#0d9488',fontWeight:'600',fontSize:'14px',marginRight:'12px'}}>{emp.name?.[0]||'?'}</div>
                        <div style={{flex:1,fontSize:'14px',fontWeight:'500'}}>{emp.name}</div>
                        <div style={{fontSize:'12px',color:'#6b7280',width:'60px',textAlign:'center'}}>{emp.completedTasks}/{emp.totalTasks}</div>
                        <div style={{width:'100px'}}><ProgressBar rate={emp.completionRate}/></div>
                        <div style={{width:'60px',textAlign:'right'}}><span style={{fontSize:'12px',fontWeight:'600',padding:'2px 8px',borderRadius:'20px',backgroundColor:emp.completionRate===100?'#d1fae5':'#f3f4f6',color:emp.completionRate===100?'#059669':'#6b7280'}}>{emp.completionRate}%</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== TRAINING PAGE ====================
const TrainingPage = ({ departments, selectedDepartment, setSelectedDepartment, trainingModules, trainingPhases, userProgress, onToggleComplete, onRefresh, canEditTraining }: {
  departments: Department[];
  selectedDepartment: Department | null;
  setSelectedDepartment: (d: Department) => void;
  trainingModules: TrainingModule[];
  trainingPhases: TrainingPhase[];
  userProgress: UserProgress[];
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onRefresh: () => void;
  canEditTraining: boolean;
}) => {
  const { currentUser } = useAuth();
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [showQuizModal, setShowQuizModal] = useState<TrainingTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState<{ task: TrainingTask | null; moduleId: string } | null>(null);
  const [showModuleModal, setShowModuleModal] = useState<TrainingModule | null>(null);
  const [showPhaseModal, setShowPhaseModal] = useState<TrainingPhase | null>(null);

  const userDept = departments.find(d => String(d.id) === String(currentUser?.department_id));
  const isStrategyOrAdmin = userDept?.name?.includes('战略') || userDept?.name?.includes('行政') || currentUser?.role === 'admin';
  const visibleDepartments = isStrategyOrAdmin ? departments : departments.filter(d => String(d.id) === String(currentUser?.department_id));

  useEffect(() => {
    if (!isStrategyOrAdmin && userDept && (!selectedDepartment || selectedDepartment.id !== userDept.id)) {
      setSelectedDepartment(userDept);
    }
  }, [userDept, isStrategyOrAdmin]);

  const modulesByPhase: Record<string, TrainingModule[]> = {};
  const unassignedModules: TrainingModule[] = [];
  trainingModules.forEach(module => {
    if (module.phase_id) {
      if (!modulesByPhase[module.phase_id]) modulesByPhase[module.phase_id] = [];
      modulesByPhase[module.phase_id].push(module);
    } else {
      unassignedModules.push(module);
    }
  });

  const sortedPhases = [...trainingPhases].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const dayIndices: Record<string, number> = {};
  let globalDayIndex = 1;
  sortedPhases.forEach(phase => {
    (modulesByPhase[phase.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).forEach(module => {
      dayIndices[module.id] = globalDayIndex++;
    });
  });
  unassignedModules.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).forEach(module => {
    dayIndices[module.id] = globalDayIndex++;
  });

  const isTaskCompleted = (taskId: string) => userProgress?.find(p => String(p.task_id) === String(taskId))?.is_completed || false;

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定删除此任务？')) return;
    await supabase.from('training_tasks').delete().eq('id', taskId);
    onRefresh();
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('确定删除此培训日？')) return;
    await supabase.from('training_modules').delete().eq('id', moduleId);
    onRefresh();
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm('确定删除此阶段？')) return;
    await supabase.from('training_phases').delete().eq('id', phaseId);
    onRefresh();
  };

  const handleSaveTask = async (taskData: any) => {
    if (taskData.id) {
      await supabase.from('training_tasks').update({ title: taskData.title, task_type: taskData.task_type }).eq('id', taskData.id);
    } else {
      const { data: existing } = await supabase.from('training_tasks').select('sort_order').eq('module_id', taskData.module_id).order('sort_order', { ascending: false }).limit(1);
      await supabase.from('training_tasks').insert({ module_id: taskData.module_id, title: taskData.title, task_type: taskData.task_type || 'quiz', sort_order: ((existing as any)?.[0]?.sort_order || 0) + 1 });
    }
    setShowTaskModal(null);
    onRefresh();
  };

  const handleSaveModule = async (moduleData: any) => {
    if (!selectedDepartment?.id && !moduleData.id) { alert('请先选择部门'); return; }
    if (moduleData.id) {
      await supabase.from('training_modules').update({ title: moduleData.title, duration: moduleData.duration, phase_id: moduleData.phase_id || null }).eq('id', moduleData.id);
    } else {
      const { data: existing } = await supabase.from('training_modules').select('sort_order').eq('department_id', selectedDepartment!.id).order('sort_order', { ascending: false }).limit(1);
      const newSortOrder = ((existing as any)?.[0]?.sort_order || 0) + 1;
      await supabase.from('training_modules').insert({ department_id: selectedDepartment!.id, title: moduleData.title, day_number: newSortOrder, duration: moduleData.duration, phase_id: moduleData.phase_id || null, sort_order: newSortOrder });
    }
    setShowModuleModal(null);
    onRefresh();
  };

  const handleSavePhase = async (phaseData: any) => {
    if (!selectedDepartment?.id && !phaseData.id) { alert('请先选择部门'); return; }
    if (phaseData.id) {
      await supabase.from('training_phases').update({ name: phaseData.name, description: phaseData.description }).eq('id', phaseData.id);
    } else {
      const { data: existing } = await supabase.from('training_phases').select('sort_order').eq('department_id', selectedDepartment!.id).order('sort_order', { ascending: false }).limit(1);
      await supabase.from('training_phases').insert({ department_id: selectedDepartment!.id, name: phaseData.name, description: phaseData.description, sort_order: ((existing as any)?.[0]?.sort_order || 0) + 1 });
    }
    setShowPhaseModal(null);
    onRefresh();
  };

  const getTaskTypeStyle = (type: string) => {
    const styles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
      quiz: { bg: '#fef3c7', color: '#d97706', label: '题目考核', icon: '📝' },
      homework: { bg: '#dbeafe', color: '#2563eb', label: '作业考核', icon: '📤' },
      self: { bg: '#d1fae5', color: '#059669', label: '自主完成', icon: '✅' },
      team: { bg: '#f3e8ff', color: '#7c3aed', label: '组队研习', icon: '👥' }
    };
    return styles[type] || styles.quiz;
  };

  const TaskCard = ({ task }: { task: TrainingTask }) => {
    const completed = isTaskCompleted(task.id);
    const typeStyle = getTaskTypeStyle(task.task_type);
    return (
      <div style={{padding:'16px',borderRadius:'12px',border:`1px solid ${completed?'#99f6e4':'#e5e7eb'}`,backgroundColor:completed?'#f0fdfa':'white',marginBottom:'8px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div onClick={() => { if (task.task_type === 'quiz' && !completed) setShowQuizModal(task); else if (task.task_type === 'self' || completed) onToggleComplete(task.id, !completed); }} style={{width:'24px',height:'24px',borderRadius:'50%',border:`2px solid ${completed?'#0d9488':'#d1d5db'}`,backgroundColor:completed?'#0d9488':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{completed && <Icons.Check/>}</div>
            <div>
              <div style={{fontSize:'14px',fontWeight:'500',color:completed?'#0d9488':'#1f2937'}}>{task.title}</div>
              <span style={{fontSize:'12px',padding:'2px 8px',borderRadius:'20px',backgroundColor:typeStyle.bg,color:typeStyle.color,marginTop:'4px',display:'inline-block'}}>{typeStyle.icon} {typeStyle.label}</span>
            </div>
          </div>
          {canEditTraining && (
            <div style={{display:'flex',gap:'4px'}}>
              <button onClick={() => setShowTaskModal({ task, moduleId: task.module_id })} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Edit/></button>
              <button onClick={() => handleDeleteTask(task.id)} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Delete/></button>
            </div>
          )}
        </div>
        {task.task_type === 'quiz' && !completed && <button onClick={() => setShowQuizModal(task)} style={{marginTop:'12px',width:'100%',padding:'8px',backgroundColor:'#fef3c7',color:'#d97706',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>📝 开始考核</button>}
      </div>
    );
  };

  const ModuleCard = ({ module }: { module: TrainingModule }) => {
    const dayIndex = dayIndices[module.id];
    const isExpanded = expandedDays[module.id] !== false;
    const tasks = (module.training_tasks || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const completedCount = tasks.filter(t => isTaskCompleted(t.id)).length;

    return (
      <div style={{backgroundColor:'white',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'12px',overflow:'hidden'}}>
        <div onClick={() => setExpandedDays(prev => ({...prev, [module.id]: !isExpanded}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'8px',backgroundColor:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'14px'}}>D{dayIndex}</div>
            <div><div style={{fontWeight:'600',color:'#1f2937'}}>{module.title}</div><div style={{fontSize:'12px',color:'#9ca3af'}}>{completedCount}/{tasks.length} 任务完成{module.duration && ` · ${module.duration}`}</div></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            {canEditTraining && (<><button onClick={e => { e.stopPropagation(); setShowModuleModal(module); }} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Edit/></button><button onClick={e => { e.stopPropagation(); handleDeleteModule(module.id); }} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Delete/></button></>)}
            <Icons.Chevron expanded={isExpanded}/>
          </div>
        </div>
        {isExpanded && (
          <div style={{padding:'16px',paddingTop:0,borderTop:'1px solid #f3f4f6'}}>
            {tasks.map(task => <TaskCard key={task.id} task={task}/>)}
            {tasks.length === 0 && <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:'14px'}}>暂无任务</div>}
            {canEditTraining && <button onClick={() => setShowTaskModal({ task: null, moduleId: module.id })} style={{width:'100%',padding:'10px',border:'2px dashed #d1d5db',borderRadius:'8px',backgroundColor:'transparent',color:'#6b7280',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><Icons.Plus/> 添加任务</button>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{marginBottom:'24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div><div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}><Icons.Training/><h1 style={{fontSize:'20px',fontWeight:'700',color:'#1f2937',margin:0}}>培训计划</h1></div><p style={{fontSize:'14px',color:'#6b7280',margin:0}}>{canEditTraining?'管理培训阶段和任务':'完成培训任务，开始你的职业之旅'}</p></div>
        {canEditTraining && <div style={{display:'flex',gap:'8px'}}><button onClick={() => setShowPhaseModal({} as any)} style={{padding:'10px 16px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}><Icons.Plus/> 添加阶段</button><button onClick={() => setShowModuleModal({} as any)} style={{padding:'10px 16px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontSize:'14px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}><Icons.Plus/> 添加培训日</button></div>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:'24px'}}>
        <div>
          <div style={{fontSize:'12px',fontWeight:'600',color:'#374151',marginBottom:'10px'}}>目标部门 / 岗位</div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {visibleDepartments.map(dept => (
              <div key={dept.id} onClick={() => setSelectedDepartment(dept)} style={{padding:'10px 14px',borderRadius:'8px',border:selectedDepartment?.id===dept.id?'2px solid #14b8a6':'1px solid #e5e7eb',backgroundColor:selectedDepartment?.id===dept.id?'#f0fdfa':'#ffffff',color:selectedDepartment?.id===dept.id?'#0d9488':'#374151',fontWeight:selectedDepartment?.id===dept.id?'600':'500',fontSize:'13px',cursor:'pointer'}}>{dept.name}</div>
            ))}
          </div>
        </div>
        <div style={{backgroundColor:'#f9fafb',borderRadius:'12px',padding:'20px'}}>
          <h2 style={{fontSize:'16px',fontWeight:'700',color:'#1f2937',marginBottom:'18px'}}>{selectedDepartment?.name || ''} - 培训日程</h2>
          {trainingModules.length === 0 && trainingPhases.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#9ca3af',backgroundColor:'white',borderRadius:'10px',fontSize:'13px'}}>
              暂无培训内容
              {canEditTraining && <div style={{marginTop:'10px',display:'flex',gap:'8px',justifyContent:'center'}}><button onClick={() => setShowPhaseModal({} as any)} style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #e5e7eb',backgroundColor:'white',fontSize:'13px',cursor:'pointer'}}>添加阶段</button><button onClick={() => setShowModuleModal({} as any)} style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontSize:'13px',cursor:'pointer'}}>添加培训日</button></div>}
            </div>
          ) : (
            <>
              {sortedPhases.map(phase => {
                const phaseModules = (modulesByPhase[phase.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                const isExpanded = expandedPhases[phase.id] !== false;
                return (
                  <div key={phase.id} style={{marginBottom:'16px'}}>
                    <div onClick={() => setExpandedPhases(prev => ({...prev, [phase.id]: !isExpanded}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',borderRadius:'12px',cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'18px'}}>📚</span><span style={{fontWeight:'600'}}>{phase.name}</span><span style={{color:'#99f6e4',fontSize:'14px'}}>({phaseModules.length} 天)</span></div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        {canEditTraining && (<><button onClick={e => { e.stopPropagation(); setShowPhaseModal(phase); }} style={{padding:'4px',border:'none',background:'none',cursor:'pointer',color:'white'}}><Icons.Edit/></button><button onClick={e => { e.stopPropagation(); handleDeletePhase(phase.id); }} style={{padding:'4px',border:'none',background:'none',cursor:'pointer',color:'white'}}><Icons.Delete/></button></>)}
                        <Icons.Chevron expanded={isExpanded}/>
                      </div>
                    </div>
                    {isExpanded && <div style={{marginTop:'12px',marginLeft:'16px'}}>{phaseModules.map(module => <ModuleCard key={module.id} module={module}/>)}{phaseModules.length === 0 && <div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:'14px'}}>此阶段暂无培训日</div>}</div>}
                  </div>
                );
              })}
              {unassignedModules.length > 0 && (
                <div style={{marginTop:'16px'}}>
                  {sortedPhases.length > 0 && <div style={{fontSize:'14px',color:'#6b7280',marginBottom:'12px',display:'flex',alignItems:'center',gap:'8px'}}><span>📋</span> 未分配阶段</div>}
                  {unassignedModules.map(module => <ModuleCard key={module.id} module={module}/>)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showTaskModal && <TaskModal task={showTaskModal.task} moduleId={showTaskModal.moduleId} onSave={handleSaveTask} onClose={() => setShowTaskModal(null)}/>}
      {showModuleModal && <ModuleModal module={showModuleModal.id ? showModuleModal : null} phases={trainingPhases} onSave={handleSaveModule} onClose={() => setShowModuleModal(null)}/>}
      {showPhaseModal && <PhaseModal phase={showPhaseModal.id ? showPhaseModal : null} onSave={handleSavePhase} onClose={() => setShowPhaseModal(null)}/>}
      {showQuizModal && <QuizModal task={showQuizModal} onComplete={() => { onToggleComplete(showQuizModal.id, true); setShowQuizModal(null); }} onClose={() => setShowQuizModal(null)}/>}
    </div>
  );
};

// Task Modal
const TaskModal = ({ task, moduleId, onSave, onClose }: { task: TrainingTask | null; moduleId: string; onSave: (data: any) => void; onClose: () => void }) => {
  const [form, setForm] = useState({ title: task?.title || '', task_type: task?.task_type || 'quiz' });
  const taskTypes = [
    { key: 'quiz', label: '题目考核', icon: '📝', desc: '需答题100分通过' },
    { key: 'homework', label: '作业考核', icon: '📤', desc: '上传作业，组长审批' },
    { key: 'self', label: '自主完成', icon: '✅', desc: '员工可直接标记完成' },
    { key: 'team', label: '组队研习', icon: '👥', desc: '团队协作完成任务' }
  ];
  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'480px'}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 24px',fontSize:'18px',fontWeight:'600'}}>{task ? '编辑任务' : '添加任务'}</h3>
        <form onSubmit={e => { e.preventDefault(); if (!form.title) return; onSave({ ...form, id: task?.id, module_id: moduleId }); }}>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>任务标题 *</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required/></div>
          <div style={{marginBottom:'24px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>任务类型</label><div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px'}}>{taskTypes.map(t => (<label key={t.key} style={{padding:'12px',borderRadius:'8px',border:form.task_type===t.key?'2px solid #0d9488':'1px solid #e5e7eb',backgroundColor:form.task_type===t.key?'#f0fdfa':'white',cursor:'pointer'}}><input type="radio" name="task_type" checked={form.task_type===t.key} onChange={() => setForm({...form, task_type: t.key})} style={{display:'none'}}/><div style={{fontSize:'18px',marginBottom:'4px'}}>{t.icon}</div><div style={{fontSize:'13px',fontWeight:'500'}}>{t.label}</div><div style={{fontSize:'11px',color:'#9ca3af'}}>{t.desc}</div></label>))}</div></div>
          <div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}><button type="button" onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button type="submit" style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>保存</button></div>
        </form>
      </div>
    </div>
  );
};

// Module Modal
const ModuleModal = ({ module, phases, onSave, onClose }: { module: TrainingModule | null; phases: TrainingPhase[]; onSave: (data: any) => void; onClose: () => void }) => {
  const [form, setForm] = useState({ title: module?.title || '', duration: module?.duration || '', phase_id: module?.phase_id || '' });
  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'480px'}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 24px',fontSize:'18px',fontWeight:'600'}}>{module ? '编辑培训日' : '添加培训日'}</h3>
        <form onSubmit={e => { e.preventDefault(); if (!form.title) return; onSave({ ...form, id: module?.id }); }}>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>培训主题 *</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required/></div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>时长</label><input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="例如: 2小时" style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}}/></div>
          {phases.length > 0 && <div style={{marginBottom:'24px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>所属阶段</label><select value={form.phase_id} onChange={e => setForm({...form, phase_id: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px',backgroundColor:'white'}}><option value="">不分配阶段</option>{phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
          <div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}><button type="button" onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button type="submit" style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>保存</button></div>
        </form>
      </div>
    </div>
  );
};

// Phase Modal
const PhaseModal = ({ phase, onSave, onClose }: { phase: TrainingPhase | null; onSave: (data: any) => void; onClose: () => void }) => {
  const [form, setForm] = useState({ name: phase?.name || '', description: phase?.description || '' });
  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'420px'}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 24px',fontSize:'18px',fontWeight:'600'}}>{phase ? '编辑阶段' : '添加阶段'}</h3>
        <form onSubmit={e => { e.preventDefault(); if (!form.name) return; onSave({ ...form, id: phase?.id }); }}>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>阶段名称 *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例如: 第一阶段 - 基础培训" style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required/></div>
          <div style={{marginBottom:'24px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>阶段描述</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px',minHeight:'80px',resize:'vertical'}}/></div>
          <div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}><button type="button" onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button type="submit" style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>保存</button></div>
        </form>
      </div>
    </div>
  );
};

// Quiz Modal
const QuizModal = ({ task, onComplete, onClose }: { task: TrainingTask; onComplete: () => void; onClose: () => void }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('quiz_questions').select('*').eq('task_id', task.id).order('sort_order');
      setQuestions((data as QuizQuestion[]) || []);
      setLoading(false);
    };
    fetch();
  }, [task.id]);

  const handleSubmit = () => {
    if (questions.length === 0) { onComplete(); return; }
    let correct = 0;
    questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (q.question_type === 'multiple') {
        const userArr = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        const correctArr = [...(q.correct_answers || [])].sort();
        if (JSON.stringify(userArr) === JSON.stringify(correctArr)) correct++;
      } else {
        if (userAnswer === q.correct_answers?.[0]) correct++;
      }
    });
    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);
    if (finalScore === 100) setTimeout(onComplete, 1500);
  };

  if (loading) return <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}><div style={{backgroundColor:'white',borderRadius:'16px',padding:'40px',textAlign:'center'}}><Icons.Spinner/> 加载题目...</div></div>;

  if (questions.length === 0) return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'40px',textAlign:'center',width:'400px'}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>📝</div>
        <h3 style={{fontSize:'18px',fontWeight:'600',marginBottom:'8px'}}>暂无考核题目</h3>
        <p style={{color:'#6b7280',fontSize:'14px',marginBottom:'24px'}}>管理员还未设置此任务的考核题目</p>
        <button onClick={onComplete} style={{padding:'12px 24px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>直接完成</button>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'40px',textAlign:'center',width:'400px'}} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:'64px',marginBottom:'16px'}}>{score === 100 ? '🎉' : '😅'}</div>
        <h3 style={{fontSize:'24px',fontWeight:'700',marginBottom:'8px'}}>{score === 100 ? '恭喜通过！' : '未能通过'}</h3>
        <p style={{fontSize:'40px',fontWeight:'700',color:'#0d9488',marginBottom:'16px'}}>{score}分</p>
        <p style={{color:'#6b7280',fontSize:'14px',marginBottom:'24px'}}>{score === 100 ? '太棒了，继续保持！' : '需要100分才能通过，再接再厉！'}</p>
        <button onClick={score === 100 ? onComplete : () => { setSubmitted(false); setAnswers({}); }} style={{padding:'12px 24px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>{score === 100 ? '完成' : '重新答题'}</button>
      </div>
    </div>
  );

  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'700px',maxHeight:'85vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}><h3 style={{margin:0,fontSize:'18px',fontWeight:'600'}}>📝 {task.title} - 考核</h3><button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.X/></button></div>
        <div style={{display:'flex',flexDirection:'column',gap:'24px'}}>
          {questions.map((q, idx) => (
            <div key={q.id} style={{padding:'16px',backgroundColor:'#f9fafb',borderRadius:'12px'}}>
              <div style={{fontWeight:'500',color:'#1f2937',marginBottom:'12px'}}>{idx + 1}. {q.question_text}{q.question_type === 'multiple' && <span style={{marginLeft:'8px',fontSize:'12px',backgroundColor:'#fef3c7',color:'#d97706',padding:'2px 8px',borderRadius:'20px'}}>多选</span>}</div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {(q.options || []).map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = q.question_type === 'multiple' ? (answers[q.id] as string[] || []).includes(letter) : answers[q.id] === letter;
                  return (
                    <label key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'8px',border:`1px solid ${isSelected?'#0d9488':'#e5e7eb'}`,backgroundColor:isSelected?'#f0fdfa':'white',cursor:'pointer'}}>
                      <input type={q.question_type === 'multiple' ? 'checkbox' : 'radio'} name={`q_${q.id}`} checked={isSelected} onChange={() => {
                        if (q.question_type === 'multiple') {
                          const current = (answers[q.id] as string[]) || [];
                          setAnswers({...answers, [q.id]: isSelected ? current.filter(a => a !== letter) : [...current, letter]});
                        } else {
                          setAnswers({...answers, [q.id]: letter});
                        }
                      }} style={{accentColor:'#0d9488'}}/>
                      <span style={{fontSize:'14px'}}>{letter}. {opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:'24px',display:'flex',gap:'12px',justifyContent:'flex-end'}}><button onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button onClick={handleSubmit} style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>提交答案</button></div>
      </div>
    </div>
  );
};

// ==================== RESOURCES PAGE ====================
const ResourcesPage = ({ canUploadResources }: { canUploadResources: boolean }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    const { data } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
    setResources((data as Resource[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此资料？')) return;
    await supabase.from('resources').delete().eq('id', id);
    fetchResources();
  };

  const filtered = resources.filter(r => {
    const matchSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = selectedType === 'all' || r.file_type === selectedType;
    return matchSearch && matchType;
  });

  const fileTypes = ['all', 'pdf', 'doc', 'xls', 'ppt', 'video', 'other'];
  const fileTypeLabels: Record<string, string> = { all: '全部', pdf: 'PDF', doc: 'Word', xls: 'Excel', ppt: 'PPT', video: '视频', other: '其他' };
  const getFileIcon = (type: string) => ({ pdf: '📄', doc: '📝', xls: '📊', ppt: '📽️', video: '🎬', other: '📁' }[type] || '📁');

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px'}}><Icons.Spinner/><span style={{marginLeft:'12px',color:'#6b7280'}}>加载资料...</span></div>;

  return (
    <div>
      <div style={{marginBottom:'24px'}}><div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}><Icons.Resources/><h1 style={{fontSize:'20px',fontWeight:'700',color:'#1f2937',margin:0}}>资料库</h1></div><p style={{fontSize:'14px',color:'#6b7280',margin:0}}>管理培训学习资料</p></div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{position:'relative'}}><input type="text" placeholder="搜索资料..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{paddingLeft:'36px',paddingRight:'16px',padding:'8px 16px 8px 36px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',width:'256px'}}/></div>
          <div style={{display:'flex',gap:'4px'}}>{fileTypes.map(type => (<button key={type} onClick={() => setSelectedType(type)} style={{padding:'6px 12px',borderRadius:'8px',border:'none',fontSize:'12px',cursor:'pointer',backgroundColor:selectedType===type?'#0d9488':'#f3f4f6',color:selectedType===type?'white':'#6b7280'}}>{fileTypeLabels[type]}</button>))}</div>
        </div>
        {canUploadResources && <button onClick={() => setShowModal(true)} style={{padding:'10px 16px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontSize:'14px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}><Icons.Plus/> 上传资料</button>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
        {filtered.map(resource => (
          <div key={resource.id} style={{backgroundColor:'white',borderRadius:'12px',padding:'16px',border:'1px solid #e5e7eb'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px'}}>
              <div style={{fontSize:'28px'}}>{getFileIcon(resource.file_type)}</div>
              {canUploadResources && <button onClick={() => handleDelete(resource.id)} style={{border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Delete/></button>}
            </div>
            <h3 style={{fontWeight:'500',fontSize:'14px',color:'#1f2937',marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{resource.title}</h3>
            <p style={{fontSize:'12px',color:'#9ca3af',marginBottom:'12px'}}>{new Date(resource.created_at).toLocaleDateString('zh-CN')}</p>
            <a href={resource.file_url} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:'4px',color:'#0d9488',fontSize:'12px',textDecoration:'none'}}><Icons.Download/> 下载</a>
          </div>
        ))}
        {filtered.length === 0 && <div style={{gridColumn:'span 4',textAlign:'center',padding:'64px',color:'#9ca3af'}}>暂无资料</div>}
      </div>
      {showModal && <UploadModal onClose={() => setShowModal(false)} onUpload={() => { setShowModal(false); fetchResources(); }}/>}
    </div>
  );
};

const UploadModal = ({ onClose, onUpload }: { onClose: () => void; onUpload: () => void }) => {
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const path = `uploads/${fileName}`;
    const { error } = await supabase.storage.from('resources').upload(path, file);
    if (error) { alert('上传失败: ' + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(path);
    await supabase.from('resources').insert({ title, file_type: fileType, file_url: publicUrl, file_name: file.name });
    setUploading(false);
    onUpload();
  };

  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'480px'}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 24px',fontSize:'18px',fontWeight:'600'}}>上传资料</h3>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>资料名称 *</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required/></div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>文件类型</label><select value={fileType} onChange={e => setFileType(e.target.value)} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px',backgroundColor:'white'}}><option value="pdf">PDF 文档</option><option value="doc">Word 文档</option><option value="xls">Excel 表格</option><option value="ppt">PPT 演示</option><option value="video">视频</option><option value="other">其他</option></select></div>
          <div style={{marginBottom:'24px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>选择文件 *</label><div style={{border:'2px dashed #e5e7eb',borderRadius:'12px',padding:'24px',textAlign:'center'}}><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{display:'none'}} id="file-upload"/><label htmlFor="file-upload" style={{cursor:'pointer'}}>{file ? <div style={{color:'#0d9488'}}><Icons.Document/> {file.name}</div> : <div style={{color:'#9ca3af'}}><Icons.Upload/><p style={{marginTop:'8px'}}>点击选择文件</p></div>}</label></div></div>
          <div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}><button type="button" onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button type="submit" disabled={uploading || !file} style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer',opacity:uploading||!file?0.6:1}}>{uploading ? '上传中...' : '上传'}</button></div>
        </form>
      </div>
    </div>
  );
};

// ==================== USERS PAGE ====================
const UsersPage = ({ departments, onDepartmentsChange }: { departments: Department[]; onDepartmentsChange: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<{ open: boolean; type: string | null; data: any }>({ open: false, type: null, data: null });
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at');
    setUsers((data as User[]) || []);
    setLoading(false);
  };

  const handleSaveUser = async (userData: any) => {
    if (userData.id) {
      await supabase.from('users').update({ name: userData.name, email: userData.email, department_id: userData.department_id, role: userData.role, custom_perms: userData.custom_perms }).eq('id', userData.id);
    } else {
      await supabase.from('users').insert({ name: userData.name, email: userData.email, department_id: userData.department_id, role: userData.role || 'employee', password: '12345kiwi', password_changed: false, custom_perms: userData.custom_perms });
    }
    fetchUsers();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await supabase.from('users').delete().eq('id', id);
    fetchUsers();
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`确定重置 ${user.name} 的密码为初始密码？`)) return;
    await supabase.from('users').update({ password: '12345kiwi', password_changed: false }).eq('id', user.id);
    alert('密码已重置为：12345kiwi');
  };

  const handleSaveDept = async (data: any) => {
    if (data.id) {
      await supabase.from('departments').update({ name: data.name, description: data.description }).eq('id', data.id);
    } else {
      const { data: existing } = await supabase.from('departments').select('sort_order').order('sort_order', { ascending: false }).limit(1);
      await supabase.from('departments').insert({ name: data.name, description: data.description, sort_order: ((existing as any)?.[0]?.sort_order || 0) + 1 });
    }
    onDepartmentsChange();
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('确定删除？')) return;
    await supabase.from('departments').delete().eq('id', id);
    onDepartmentsChange();
  };

  const filtered = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const usersByDept: Record<string, User[]> = {};
  departments.forEach(d => { usersByDept[d.id] = filtered.filter(u => String(u.department_id) === String(d.id)); });

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px'}}><Icons.Spinner/><span style={{marginLeft:'12px',color:'#6b7280'}}>加载用户...</span></div>;

  const EmployeeRow = ({ user }: { user: User }) => (
    <div style={{display:'flex',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #f3f4f6',backgroundColor:'white'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1}}>
        <div style={{width:'36px',height:'36px',borderRadius:'10px',backgroundColor:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'600',fontSize:'14px',overflow:'hidden'}}>{user.avatar_url ? <img src={user.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : user.name?.[0] || '?'}</div>
        <div><div style={{fontSize:'14px',fontWeight:'500',color:'#1f2937'}}>{user.name}</div><div style={{fontSize:'12px',color:'#9ca3af'}}>{user.email}</div></div>
      </div>
      <span style={{padding:'3px 10px',borderRadius:'20px',backgroundColor:ROLES[user.role]?.bg||'#f3f4f6',color:ROLES[user.role]?.color||'#6b7280',fontSize:'11px',fontWeight:'500'}}>{ROLES[user.role]?.label||'员工'}</span>
      <div style={{display:'flex',gap:'8px',marginLeft:'16px'}}>
        <button onClick={() => setModal({ open: true, type: 'user', data: user })} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Edit/></button>
        <button onClick={() => handleResetPassword(user)} style={{padding:'6px',border:'none',background:'none',cursor:'pointer'}} title="重置密码">🔑</button>
        <button onClick={() => handleDeleteUser(user.id)} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Delete/></button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:'24px'}}><div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}><Icons.Users/><h1 style={{fontSize:'20px',fontWeight:'700',color:'#1f2937',margin:0}}>账号管理</h1></div><p style={{fontSize:'14px',color:'#6b7280',margin:0}}>管理员工账号和部门</p></div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <input type="text" placeholder="搜索员工..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',width:'256px'}}/>
        <div style={{display:'flex',gap:'8px'}}><button onClick={() => setModal({ open: true, type: 'dept', data: null })} style={{padding:'10px 16px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}><Icons.Building/> 添加部门</button><button onClick={() => setModal({ open: true, type: 'user', data: null })} style={{padding:'10px 16px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontSize:'14px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}><Icons.Plus/> 添加员工</button></div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
        {departments.map(dept => {
          const deptUsers = usersByDept[dept.id] || [];
          const isExpanded = expandedDepts[dept.id] !== false;
          return (
            <div key={dept.id} style={{backgroundColor:'white',borderRadius:'12px',border:'1px solid #e5e7eb',overflow:'hidden'}}>
              <div onClick={() => setExpandedDepts(prev => ({...prev, [dept.id]: !isExpanded}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px',backgroundColor:'#f9fafb',cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}><div style={{width:'40px',height:'40px',borderRadius:'8px',backgroundColor:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'600'}}>{dept.name[0]}</div><div><div style={{fontWeight:'600',color:'#1f2937'}}>{dept.name}</div><div style={{fontSize:'12px',color:'#9ca3af'}}>{deptUsers.length} 名员工</div></div></div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}><button onClick={e => { e.stopPropagation(); setModal({ open: true, type: 'dept', data: dept }); }} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Edit/></button><button onClick={e => { e.stopPropagation(); handleDeleteDept(dept.id); }} style={{padding:'6px',border:'none',background:'none',cursor:'pointer',color:'#9ca3af'}}><Icons.Delete/></button><Icons.Chevron expanded={isExpanded}/></div>
              </div>
              {isExpanded && (deptUsers.length > 0 ? deptUsers.map(user => <EmployeeRow key={user.id} user={user}/>) : <div style={{padding:'24px',textAlign:'center',color:'#9ca3af',fontSize:'14px'}}>暂无员工</div>)}
            </div>
          );
        })}
      </div>
      {modal.open && modal.type === 'user' && <UserModal user={modal.data} departments={departments} onSave={handleSaveUser} onClose={() => setModal({ open: false, type: null, data: null })}/>}
      {modal.open && modal.type === 'dept' && <DeptModal dept={modal.data} onSave={handleSaveDept} onClose={() => setModal({ open: false, type: null, data: null })}/>}
    </div>
  );
};

const UserModal = ({ user, departments, onSave, onClose }: { user: User | null; departments: Department[]; onSave: (data: any) => void; onClose: () => void }) => {
  const getInitialPerms = () => user?.custom_perms && Array.isArray(user.custom_perms) ? user.custom_perms : ROLES[user?.role || 'employee']?.perms || [];
  const [form, setForm] = useState({ name: user?.name || '', username: user?.email?.split('@')[0] || '', department_id: user?.department_id || '', role: user?.role || 'employee', custom_perms: getInitialPerms() });
  const [saving, setSaving] = useState(false);

  const handleRoleChange = (newRole: string) => setForm({ ...form, role: newRole, custom_perms: ROLES[newRole]?.perms || [] });
  const togglePerm = (permKey: string) => {
    const current = form.custom_perms || [];
    setForm({ ...form, custom_perms: current.includes(permKey) ? current.filter(p => p !== permKey) : [...current, permKey] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.department_id) { alert('请填写必填项'); return; }
    setSaving(true);
    await onSave({ id: user?.id, name: form.name, email: form.username + '@mykiwiedu.com', department_id: form.department_id, role: form.role, custom_perms: ['leader', 'admin_staff'].includes(form.role) ? form.custom_perms : null });
    setSaving(false);
    onClose();
  };

  const roleOptions = [{ key: 'employee', label: '普通员工' }, { key: 'leader', label: '组长' }, { key: 'admin_staff', label: '行政' }, { key: 'admin', label: '管理员' }];
  const showPermissions = ['leader', 'admin_staff'].includes(form.role);

  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'520px',maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 24px',fontSize:'18px',fontWeight:'600'}}>{user ? '编辑员工' : '添加员工'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>姓名 *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required/></div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>用户名 *</label><div style={{display:'flex'}}><input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')})} style={{flex:1,padding:'12px',borderRadius:'10px 0 0 10px',border:'1px solid #e5e7eb',borderRight:'none',fontSize:'14px'}}/><span style={{padding:'12px',backgroundColor:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:'0 10px 10px 0',color:'#6b7280',fontSize:'14px'}}>@mykiwiedu.com</span></div></div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>所属部门 *</label><select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px',backgroundColor:'white'}} required><option value="">请选择</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>角色</label><div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px'}}>{roleOptions.map(r => (<label key={r.key} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'10px',borderRadius:'8px',border:form.role===r.key?'2px solid #0d9488':'1px solid #e5e7eb',backgroundColor:form.role===r.key?'#f0fdfa':'white',cursor:'pointer',fontSize:'13px'}}><input type="radio" name="role" checked={form.role===r.key} onChange={() => handleRoleChange(r.key)} style={{display:'none'}}/><span style={{color:form.role===r.key?'#0d9488':'#6b7280'}}>{r.label}</span></label>))}</div></div>
          {showPermissions && (
            <div style={{marginBottom:'24px',padding:'16px',backgroundColor:'#f9fafb',borderRadius:'10px',border:'1px solid #e5e7eb'}}>
              <label style={{display:'block',marginBottom:'12px',fontSize:'14px',fontWeight:'600',color:'#374151'}}>🔐 权限设置 <span style={{fontWeight:'400',color:'#6b7280',fontSize:'12px'}}>（可自定义{ROLES[form.role]?.label}的权限）</span></label>
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {PERMISSIONS.map(perm => {
                  const isChecked = (form.custom_perms || []).includes(perm.key);
                  return (
                    <label key={perm.key} style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer',padding:'8px 10px',borderRadius:'8px',backgroundColor:isChecked?'#f0fdfa':'white',border:isChecked?'1px solid #14b8a6':'1px solid #e5e7eb'}}>
                      <input type="checkbox" checked={isChecked} onChange={() => togglePerm(perm.key)} style={{marginTop:'2px',width:'16px',height:'16px',accentColor:'#0d9488'}}/>
                      <div><div style={{fontSize:'13px',fontWeight:'500',color:isChecked?'#0d9488':'#374151'}}>{perm.label}</div><div style={{fontSize:'11px',color:'#9ca3af'}}>{perm.desc}</div></div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}><button type="button" onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button type="submit" disabled={saving} style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>{saving ? '保存中...' : '保存'}</button></div>
        </form>
      </div>
    </div>
  );
};

const DeptModal = ({ dept, onSave, onClose }: { dept: Department | null; onSave: (data: any) => void; onClose: () => void }) => {
  const [form, setForm] = useState({ name: dept?.name || '', description: dept?.description || '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!form.name) return; setSaving(true); await onSave({ id: dept?.id, ...form }); setSaving(false); onClose(); };
  return (
    <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{backgroundColor:'white',borderRadius:'16px',padding:'24px',width:'420px'}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 24px',fontSize:'18px',fontWeight:'600'}}>{dept ? '编辑部门' : '添加部门'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>部门名称 *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}} required/></div>
          <div style={{marginBottom:'24px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'14px',fontWeight:'500'}}>部门描述</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px',minHeight:'80px',resize:'vertical'}}/></div>
          <div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}><button type="button" onClick={onClose} style={{padding:'10px 20px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button type="submit" disabled={saving} style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>{saving ? '保存中...' : '保存'}</button></div>
        </form>
      </div>
    </div>
  );
};

// ==================== PROFILE PAGE ====================
const ProfilePage = ({ departments }: { departments: Department[] }) => {
  const { currentUser, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [form, setForm] = useState({ name: currentUser?.name || '' });
  const [saving, setSaving] = useState(false);

  const department = departments.find(d => String(d.id) === String(currentUser?.department_id));

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('users').update({ name: form.name }).eq('id', currentUser!.id);
    updateUser({ ...currentUser!, name: form.name });
    setIsEditing(false);
    setSaving(false);
  };

  return (
    <div style={{maxWidth:'640px',margin:'0 auto'}}>
      <div style={{marginBottom:'32px'}}><h1 style={{fontSize:'20px',fontWeight:'700',color:'#1f2937',margin:'0 0 4px'}}>个人中心</h1><p style={{fontSize:'14px',color:'#6b7280',margin:0}}>管理您的账号信息</p></div>
      <div style={{backgroundColor:'white',borderRadius:'16px',border:'1px solid #e5e7eb',overflow:'hidden'}}>
        <div style={{background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',padding:'32px',textAlign:'center'}}>
          <div style={{width:'96px',height:'96px',borderRadius:'16px',backgroundColor:'white',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'36px',fontWeight:'700',color:'#0d9488',margin:'0 auto',overflow:'hidden'}}>{currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : currentUser?.name?.[0] || 'A'}</div>
          <h2 style={{marginTop:'16px',fontSize:'20px',fontWeight:'700',color:'white'}}>{currentUser?.name}</h2>
          <p style={{color:'#99f6e4',fontSize:'14px'}}>{currentUser?.email}</p>
        </div>
        <div style={{padding:'24px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}><span style={{color:'#6b7280',fontSize:'14px'}}>角色</span><span style={{padding:'3px 10px',borderRadius:'20px',backgroundColor:ROLES[currentUser?.role||'']?.bg||'#f3f4f6',color:ROLES[currentUser?.role||'']?.color||'#6b7280',fontSize:'12px',fontWeight:'500'}}>{ROLES[currentUser?.role||'']?.label||'员工'}</span></div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}><span style={{color:'#6b7280',fontSize:'14px'}}>所属部门</span><span style={{color:'#1f2937',fontWeight:'500'}}>{department?.name || '未分配'}</span></div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}><span style={{color:'#6b7280',fontSize:'14px'}}>姓名</span>{isEditing ? <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{padding:'6px 12px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',width:'160px'}}/> : <span style={{color:'#1f2937',fontWeight:'500'}}>{currentUser?.name}</span>}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}><span style={{color:'#6b7280',fontSize:'14px'}}>邮箱</span><span style={{color:'#1f2937',fontWeight:'500'}}>{currentUser?.email}</span></div>
          <div style={{marginTop:'24px',display:'flex',gap:'12px'}}>
            {isEditing ? (<><button onClick={() => setIsEditing(false)} style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer'}}>取消</button><button onClick={handleSave} disabled={saving} style={{flex:1,padding:'12px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>{saving ? '保存中...' : '保存'}</button></>) : (<><button onClick={() => setIsEditing(true)} style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',backgroundColor:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><Icons.Edit/> 编辑信息</button><button onClick={() => setShowPwdModal(true)} style={{flex:1,padding:'12px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',color:'white',fontWeight:'600',cursor:'pointer'}}>🔐 修改密码</button></>)}
          </div>
        </div>
      </div>
      {showPwdModal && <ChangePasswordModal user={currentUser!} onComplete={u => { updateUser(u); setShowPwdModal(false); }} onClose={() => setShowPwdModal(false)}/>}
    </div>
  );
};

// ==================== MAIN APP ====================
const MainApp = () => {
  const { currentUser, isLoggedIn, loading: authLoading, showChangePassword, handlePasswordChanged } = useAuth();
  const [activeNav, setActiveNav] = useState('training');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);
  const [trainingPhases, setTrainingPhases] = useState<TrainingPhase[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';
  const canEditTraining = hasPerm(currentUser, 'edit_training') || hasPerm(currentUser, 'all');
  const canUploadResources = hasPerm(currentUser, 'upload_resources') || hasPerm(currentUser, 'all');
  const canManageUsers = hasPerm(currentUser, 'manage_users') || hasPerm(currentUser, 'all');

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('sort_order');
    if (data?.length) {
      setDepartments(data as Department[]);
      if (!selectedDepartment) {
        const userDept = data.find((d: any) => String(d.id) === String(currentUser?.department_id));
        const isStrategyOrAdmin = userDept?.name?.includes('战略') || userDept?.name?.includes('行政') || currentUser?.role === 'admin';
        setSelectedDepartment((isStrategyOrAdmin ? data[0] : userDept || data[0]) as Department);
      }
    }
  };

  const fetchTrainingModules = async () => {
    if (!selectedDepartment) return;
    const { data: phasesData } = await supabase.from('training_phases').select('*').eq('department_id', selectedDepartment.id).order('sort_order');
    setTrainingPhases((phasesData as TrainingPhase[]) || []);
    const { data } = await supabase.from('training_modules').select('*, training_tasks(*)').eq('department_id', selectedDepartment.id).order('sort_order');
    setTrainingModules((data as TrainingModule[]) || []);
  };

  const fetchUserProgress = async () => {
    if (!currentUser?.id) return;
    const { data } = await supabase.from('user_task_progress').select('*').eq('user_id', currentUser.id);
    setUserProgress((data as UserProgress[]) || []);
  };

  useEffect(() => {
    if (currentUser) {
      const load = async () => { await fetchDepartments(); await fetchUserProgress(); setLoading(false); };
      load();
    }
  }, [currentUser]);

  useEffect(() => { if (selectedDepartment) fetchTrainingModules(); }, [selectedDepartment]);

  useEffect(() => {
    if (currentUser) {
      const canSeeDashboard = ['admin', 'admin_staff'].includes(currentUser.role) || hasPerm(currentUser, 'view_team_progress');
      if (!canSeeDashboard && activeNav === 'dashboard') setActiveNav('training');
    }
  }, [currentUser]);

  const handleToggleComplete = async (taskId: string, isCompleted: boolean) => {
    const existing = userProgress.find(p => String(p.task_id) === String(taskId));
    if (existing) {
      await supabase.from('user_task_progress').update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }).eq('id', existing.id);
    } else {
      await supabase.from('user_task_progress').insert({ user_id: currentUser!.id, task_id: taskId, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null });
    }
    fetchUserProgress();
  };

  if (authLoading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f9fafb'}}><Icons.Spinner/><span style={{marginLeft:'12px',color:'#6b7280'}}>加载中...</span></div>;
  if (!isLoggedIn) return <LoginPage/>;
  if (showChangePassword) return <ChangePasswordModal user={currentUser!} isForced={true} onComplete={handlePasswordChanged}/>;
  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f9fafb'}}><Icons.Spinner/><span style={{marginLeft:'12px',color:'#6b7280'}}>加载数据...</span></div>;

  const renderPage = () => {
    switch (activeNav) {
      case 'dashboard': return <Dashboard departments={departments}/>;
      case 'training': return <TrainingPage departments={departments} selectedDepartment={selectedDepartment} setSelectedDepartment={setSelectedDepartment} trainingModules={trainingModules} trainingPhases={trainingPhases} userProgress={userProgress} onToggleComplete={handleToggleComplete} onRefresh={fetchTrainingModules} canEditTraining={canEditTraining}/>;
      case 'resources': return <ResourcesPage canUploadResources={canUploadResources}/>;
      case 'users': return canManageUsers ? <UsersPage departments={departments} onDepartmentsChange={fetchDepartments}/> : <div style={{textAlign:'center',padding:'60px',color:'#9ca3af'}}><h2 style={{color:'#1f2937'}}>无权限访问</h2></div>;
      case 'profile': return <ProfilePage departments={departments}/>;
      default: return <div style={{textAlign:'center',padding:'60px',color:'#9ca3af'}}><h2 style={{color:'#1f2937'}}>功能开发中...</h2></div>;
    }
  };

  return (
    <div style={{display:'flex',minHeight:'100vh',backgroundColor:'#f8fafa'}}>
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav}/>
      <div style={{flex:1,marginLeft:'240px',padding:'28px 36px'}}>{renderPage()}</div>
    </div>
  );
};

// ==================== EXPORT ====================
export default function Home() {
  return (
    <AuthProvider>
      <MainApp/>
    </AuthProvider>
  );
}
