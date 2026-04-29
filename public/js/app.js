const API = '/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentProject = null;
let editingProjectId = null;
let editingTaskId = null;
let editingTaskForStatus = null;
let allTasks = [];
let isLogin = true;

// ─── API Helper ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Request failed');
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
document.getElementById('authToggleLink').addEventListener('click', () => {
  isLogin = !isLogin;
  document.getElementById('authTitle').textContent = isLogin ? 'Welcome back' : 'Create account';
  document.getElementById('authSubtitle').textContent = isLogin ? 'Sign in to your account' : 'Start managing your projects';
  document.getElementById('authBtnText').textContent = isLogin ? 'Sign In' : 'Sign Up';
  document.getElementById('authToggleText').textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
  document.getElementById('authToggleLink').textContent = isLogin ? ' Sign up' : ' Sign in';
  document.getElementById('nameField').classList.toggle('hidden', isLogin);
  document.getElementById('roleField').classList.toggle('hidden', isLogin);
  document.getElementById('authAlert').innerHTML = '';
});

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('authAlert');
  alertEl.innerHTML = '';
  try {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    let data;
    if (isLogin) {
      data = await api('POST', '/auth/login', { email, password });
    } else {
      const name = document.getElementById('nameInput').value;
      const role = document.getElementById('roleInput').value;
      data = await api('POST', '/auth/signup', { name, email, password, role });
    }
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    initApp();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
}

// ─── App Init ─────────────────────────────────────────────────────────────────
function initApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarRole').textContent = currentUser.role;
  document.getElementById('sidebarAvatar').textContent = currentUser.name[0].toUpperCase();

  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }
  navigate('dashboard');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById(`${page}Page`);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  if (page === 'dashboard') loadDashboard();
  else if (page === 'projects') loadProjects();
  else if (page === 'myTasks') loadMyTasks();
  else if (page === 'users') loadUsers();
}

document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const stats = await api('GET', '/dashboard/stats');
    const statusMap = {};
    stats.tasksByStatus.forEach(s => { statusMap[s.status] = parseInt(s.count); });

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Projects</div><div class="stat-value primary">${stats.totalProjects}</div></div>
      <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-value">${stats.totalTasks}</div></div>
      <div class="stat-card"><div class="stat-label">My Tasks</div><div class="stat-value primary">${stats.myTasks}</div></div>
      <div class="stat-card"><div class="stat-label">Overdue</div><div class="stat-value danger">${stats.overdueTasks}</div></div>
    `;

    document.getElementById('statusBreakdown').innerHTML = `
      <div class="task-item" style="cursor:default">
        <div class="task-content">
          <div class="flex items-center gap-2" style="justify-content:space-between;margin-bottom:0.5rem">
            <span>To Do</span><span class="badge badge-todo">${statusMap['todo'] || 0}</span>
          </div>
          <div class="flex items-center gap-2" style="justify-content:space-between;margin-bottom:0.5rem">
            <span>In Progress</span><span class="badge badge-in_progress">${statusMap['in_progress'] || 0}</span>
          </div>
          <div class="flex items-center gap-2" style="justify-content:space-between">
            <span>Done</span><span class="badge badge-done">${statusMap['done'] || 0}</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById('quickActions').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.75rem">
        <button class="btn btn-secondary w-full" style="justify-content:flex-start" onclick="navigate('projects')">📁 View All Projects</button>
        <button class="btn btn-secondary w-full" style="justify-content:flex-start" onclick="navigate('myTasks')">✅ View My Tasks</button>
        ${currentUser.role === 'admin' ? `<button class="btn btn-primary w-full" style="justify-content:flex-start" onclick="navigate('projects');setTimeout(openProjectModal,100)">+ Create New Project</button>` : ''}
      </div>
    `;
  } catch (err) { console.error(err); }
}

// ─── Projects ─────────────────────────────────────────────────────────────────
async function loadProjects() {
  try {
    const projects = await api('GET', '/projects');
    const grid = document.getElementById('projectsGrid');
    if (currentUser.role === 'admin') {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
    if (!projects.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📁</div><p>No projects yet${currentUser.role === 'admin' ? '. Create your first project!' : '.'}</p></div>`;
      return;
    }
    grid.innerHTML = projects.map(p => `
      <div class="project-card" onclick="loadProjectDetail(${p.id})">
        <div class="project-card-header">
          <div class="project-name">${escHtml(p.name)}</div>
          <span class="badge badge-${p.status}">${p.status}</span>
        </div>
        <p class="project-desc">${escHtml(p.description || 'No description')}</p>
        <div class="project-meta">
          <span>👤 ${escHtml(p.owner?.name || 'Unknown')}</span>
          ${currentUser.role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteProject(${p.id})">Delete</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadProjectDetail(id) {
  try {
    const project = await api('GET', `/projects/${id}`);
    currentProject = project;
    document.getElementById('projectDetailName').textContent = project.name;
    document.getElementById('projectDetailDesc').textContent = project.description || '';
    document.getElementById('projectDetailStatus').innerHTML = `<span class="badge badge-${project.status}">${project.status}</span>`;

    // Check if current user is project admin
    const isAdmin = currentUser.role === 'admin' ||
      project.members?.some(m => m.id === currentUser.id && m.ProjectMember?.role === 'admin') ||
      project.ownerId === currentUser.id;

    document.querySelectorAll('.admin-only-project').forEach(el => {
      el.classList.toggle('hidden', !isAdmin);
    });

    allTasks = project.tasks || [];
    renderTasks(allTasks);
    renderMembersTab(project.members || []);

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('projectDetailPage').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-page="projects"]').classList.add('active');
    switchTab('tasks');
  } catch (err) { alert(err.message); }
}

function renderTasks(tasks) {
  const today = new Date().toISOString().split('T')[0];
  const list = document.getElementById('tasksList');
  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><p>No tasks yet.</p></div>`;
    return;
  }
  list.innerHTML = tasks.map(t => {
    const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
    const canEdit = currentUser.role === 'admin' || t.assigneeId === currentUser.id ||
      currentProject?.ownerId === currentUser.id ||
      currentProject?.members?.some(m => m.id === currentUser.id && m.ProjectMember?.role === 'admin');
    return `
    <div class="task-item">
      <div class="task-checkbox ${t.status}" onclick="quickStatusCycle(${t.id}, '${t.status}')" title="Click to cycle status"></div>
      <div class="task-content">
        <div class="task-title ${t.status === 'done' ? 'done' : ''}">${escHtml(t.title)}</div>
        <div class="task-meta">
          <span class="badge badge-${t.status}">${t.status.replace('_', ' ')}</span>
          <span class="badge badge-${t.priority}">${t.priority}</span>
          ${t.assignee ? `<span class="text-muted">👤 ${escHtml(t.assignee.name)}</span>` : ''}
          ${t.dueDate ? `<span class="${isOverdue ? 'overdue' : 'text-muted'}">📅 ${t.dueDate}${isOverdue ? ' ⚠️' : ''}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        ${canEdit ? `<button class="btn-icon" onclick="openEditTaskModal(${t.id})" title="Edit">✏️</button>` : ''}
        ${(currentUser.role === 'admin' || currentProject?.ownerId === currentUser.id) ? `<button class="btn-icon" onclick="deleteTask(${t.id})" title="Delete">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderMembersTab(members) {
  const list = document.getElementById('membersList');
  if (!members.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><p>No members yet.</p></div>`;
    return;
  }
  list.innerHTML = `<div class="card"><div class="card-body">${members.map(m => `
    <div class="member-item">
      <div class="avatar" style="width:32px;height:32px;font-size:0.75rem">${m.name[0].toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-size:0.9rem;font-weight:500">${escHtml(m.name)}</div>
        <div class="text-muted">${escHtml(m.email)}</div>
      </div>
      <span class="badge badge-${m.ProjectMember?.role || 'member'}">${m.ProjectMember?.role || 'member'}</span>
    </div>`).join('')}
  </div></div>`;
}

function filterTasks(status) {
  const filtered = status ? allTasks.filter(t => t.status === status) : allTasks;
  renderTasks(filtered);
}

function filterTasksByPriority(priority) {
  const filtered = priority ? allTasks.filter(t => t.priority === priority) : allTasks;
  renderTasks(filtered);
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'tasks') || (i === 1 && tab === 'members')));
  document.getElementById('tasksTab').classList.toggle('hidden', tab !== 'tasks');
  document.getElementById('membersTab').classList.toggle('hidden', tab !== 'members');
}

// ─── Project CRUD ─────────────────────────────────────────────────────────────
function openProjectModal(project = null) {
  editingProjectId = project?.id || null;
  document.getElementById('projectModalTitle').textContent = project ? 'Edit Project' : 'New Project';
  document.getElementById('projectName').value = project?.name || '';
  document.getElementById('projectDesc').value = project?.description || '';
  document.getElementById('projectStatus').value = project?.status || 'active';
  document.getElementById('projectModalAlert').innerHTML = '';
  document.getElementById('projectModal').classList.remove('hidden');
}

async function saveProject() {
  const name = document.getElementById('projectName').value.trim();
  const description = document.getElementById('projectDesc').value.trim();
  const status = document.getElementById('projectStatus').value;
  if (!name) { document.getElementById('projectModalAlert').innerHTML = `<div class="alert alert-error">Name is required</div>`; return; }
  try {
    if (editingProjectId) await api('PUT', `/projects/${editingProjectId}`, { name, description, status });
    else await api('POST', '/projects', { name, description, status });
    closeModal('projectModal');
    loadProjects();
  } catch (err) {
    document.getElementById('projectModalAlert').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function deleteProject(id) {
  if (!confirm('Delete this project and all its tasks?')) return;
  try { await api('DELETE', `/projects/${id}`); loadProjects(); }
  catch (err) { alert(err.message); }
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────
async function openTaskModal(task = null) {
  editingTaskId = task?.id || null;
  document.getElementById('taskModalTitle').textContent = task ? 'Edit Task' : 'New Task';
  document.getElementById('taskTitle').value = task?.title || '';
  document.getElementById('taskDesc').value = task?.description || '';
  document.getElementById('taskStatus').value = task?.status || 'todo';
  document.getElementById('taskPriority').value = task?.priority || 'medium';
  document.getElementById('taskDueDate').value = task?.dueDate || '';
  document.getElementById('taskModalAlert').innerHTML = '';

  // Populate assignee dropdown
  const members = currentProject?.members || [];
  const assigneeSelect = document.getElementById('taskAssignee');
  assigneeSelect.innerHTML = '<option value="">Unassigned</option>' +
    members.map(m => `<option value="${m.id}" ${task?.assigneeId === m.id ? 'selected' : ''}>${escHtml(m.name)}</option>`).join('');

  document.getElementById('taskModal').classList.remove('hidden');
}

async function saveTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { document.getElementById('taskModalAlert').innerHTML = `<div class="alert alert-error">Title is required</div>`; return; }
  const body = {
    title,
    description: document.getElementById('taskDesc').value.trim(),
    status: document.getElementById('taskStatus').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value || null,
    assigneeId: document.getElementById('taskAssignee').value || null,
    projectId: currentProject.id
  };
  try {
    if (editingTaskId) await api('PUT', `/tasks/${editingTaskId}`, body);
    else await api('POST', '/tasks', body);
    closeModal('taskModal');
    await loadProjectDetail(currentProject.id);
  } catch (err) {
    document.getElementById('taskModalAlert').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function quickStatusCycle(taskId, currentStatus) {
  const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
  try {
    await api('PUT', `/tasks/${taskId}`, { status: cycle[currentStatus] });
    await loadProjectDetail(currentProject.id);
  } catch (err) { alert(err.message); }
}

function openEditTaskModal(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;
  editingTaskForStatus = taskId;
  // Check if user is admin/project admin - show full edit or just status
  const isAdmin = currentUser.role === 'admin' || currentProject?.ownerId === currentUser.id ||
    currentProject?.members?.some(m => m.id === currentUser.id && m.ProjectMember?.role === 'admin');
  if (isAdmin) {
    openTaskModal(task);
  } else {
    document.getElementById('editTaskStatus').value = task.status;
    document.getElementById('taskEditModal').classList.remove('hidden');
  }
}

async function updateTaskStatus() {
  const status = document.getElementById('editTaskStatus').value;
  try {
    await api('PUT', `/tasks/${editingTaskForStatus}`, { status });
    closeModal('taskEditModal');
    await loadProjectDetail(currentProject.id);
  } catch (err) { alert(err.message); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api('DELETE', `/tasks/${id}`);
    await loadProjectDetail(currentProject.id);
  } catch (err) { alert(err.message); }
}

// ─── My Tasks ─────────────────────────────────────────────────────────────────
async function loadMyTasks() {
  try {
    const tasks = await api('GET', '/tasks/my');
    const today = new Date().toISOString().split('T')[0];
    const list = document.getElementById('myTasksList');
    if (!tasks.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><p>No tasks assigned to you.</p></div>`;
      return;
    }
    list.innerHTML = tasks.map(t => {
      const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
      return `
      <div class="task-item">
        <div class="task-checkbox ${t.status}"></div>
        <div class="task-content">
          <div class="task-title ${t.status === 'done' ? 'done' : ''}">${escHtml(t.title)}</div>
          <div class="task-meta">
            <span class="badge badge-${t.status}">${t.status.replace('_', ' ')}</span>
            <span class="badge badge-${t.priority}">${t.priority}</span>
            ${t.project ? `<span class="text-muted">📁 ${escHtml(t.project.name)}</span>` : ''}
            ${t.dueDate ? `<span class="${isOverdue ? 'overdue' : 'text-muted'}">📅 ${t.dueDate}${isOverdue ? ' ⚠️' : ''}</span>` : ''}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigate('projects');setTimeout(()=>loadProjectDetail(${t.projectId}),100)">View</button>
      </div>`;
    }).join('');
  } catch (err) { console.error(err); }
}

// ─── Members Management ───────────────────────────────────────────────────────
async function openMembersModal() {
  document.getElementById('membersModalAlert').innerHTML = '';
  try {
    const users = await api('GET', '/users');
    const memberIds = new Set(currentProject.members?.map(m => m.id) || []);
    document.getElementById('addMemberSelect').innerHTML =
      '<option value="">Select user to add...</option>' +
      users.filter(u => !memberIds.has(u.id)).map(u => `<option value="${u.id}">${escHtml(u.name)} (${u.role})</option>`).join('');
    renderCurrentMembers();
    document.getElementById('membersModal').classList.remove('hidden');
  } catch (err) { alert(err.message); }
}

function renderCurrentMembers() {
  const members = currentProject.members || [];
  document.getElementById('currentMembers').innerHTML = members.length ? `
    <div style="margin-top:1rem">
      <div class="text-muted" style="margin-bottom:0.5rem;font-size:0.8rem">CURRENT MEMBERS</div>
      ${members.map(m => `
        <div class="member-item">
          <div class="avatar" style="width:32px;height:32px;font-size:0.75rem">${m.name[0].toUpperCase()}</div>
          <div style="flex:1"><div style="font-size:0.9rem">${escHtml(m.name)}</div></div>
          <span class="badge badge-${m.ProjectMember?.role || 'member'}">${m.ProjectMember?.role || 'member'}</span>
          <button class="btn-icon" onclick="removeMember(${m.id})" title="Remove">✕</button>
        </div>`).join('')}
    </div>` : '';
}

async function addMember() {
  const userId = document.getElementById('addMemberSelect').value;
  const role = document.getElementById('addMemberRole').value;
  if (!userId) return;
  try {
    await api('POST', `/projects/${currentProject.id}/members`, { userId: parseInt(userId), role });
    const updated = await api('GET', `/projects/${currentProject.id}`);
    currentProject = updated;
    await openMembersModal();
  } catch (err) {
    document.getElementById('membersModalAlert').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function removeMember(userId) {
  try {
    await api('DELETE', `/projects/${currentProject.id}/members/${userId}`);
    const updated = await api('GET', `/projects/${currentProject.id}`);
    currentProject = updated;
    renderCurrentMembers();
  } catch (err) { alert(err.message); }
}

// ─── Users (Admin) ────────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const users = await api('GET', '/users');
    document.getElementById('usersList').innerHTML = users.map(u => `
      <div class="member-item">
        <div class="avatar">${u.name[0].toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:500">${escHtml(u.name)}</div>
          <div class="text-muted">${escHtml(u.email)}</div>
        </div>
        <span class="badge badge-${u.role}">${u.role}</span>
      </div>`).join('');
  } catch (err) { console.error(err); }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
if (token && currentUser) initApp();
