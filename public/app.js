const API_URL = '/api/tasks';
const WS_URL = `ws://${window.location.host}`;

let tasks = [];
let ws = null;

const connectionStatus = document.getElementById('connectionStatus');
const statusDot = connectionStatus.querySelector('.status-dot');
const statusText = connectionStatus.querySelector('.status-text');
const notification = document.getElementById('notification');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

function updateConnectionStatus(connected) {
  if (connected) {
    statusDot.classList.remove('disconnected');
    statusDot.classList.add('connected');
    statusText.textContent = '已连接';
  } else {
    statusDot.classList.remove('connected');
    statusDot.classList.add('disconnected');
    statusText.textContent = '已断开';
  }
}

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.dataset.id = task.id;
    taskCard.innerHTML = `
      <div class="task-header">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-actions">
          <button class="task-status ${task.status}" data-id="${task.id}">
            ${task.status === 'pending' ? '待办' : '已完成'}
          </button>
          <button class="delete-btn" data-id="${task.id}">删除</button>
        </div>
      </div>
      ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-meta">
        <span>创建时间: ${formatDate(task.created_at)}</span>
        <span>更新时间: ${formatDate(task.updated_at)}</span>
      </div>
    `;
    taskList.appendChild(taskCard);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function fetchTasks() {
  try {
    const response = await fetch(API_URL);
    tasks = await response.json();
    renderTasks();
  } catch (error) {
    console.error('获取任务失败:', error);
  }
}

async function addTask() {
  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();

  if (!title) {
    showNotification('请输入任务标题');
    return;
  }

  try {
    addTaskBtn.disabled = true;
    addTaskBtn.textContent = '添加中...';

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });

    if (!response.ok) throw new Error('添加任务失败');

    taskTitle.value = '';
    taskDescription.value = '';
  } catch (error) {
    console.error('添加任务失败:', error);
    showNotification('添加任务失败，请重试');
  } finally {
    addTaskBtn.disabled = false;
    addTaskBtn.textContent = '添加任务';
  }
}

async function toggleStatus(id) {
  const task = tasks.find(t => t.id === parseInt(id));
  if (!task) return;

  const newStatus = task.status === 'pending' ? 'completed' : 'pending';

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) throw new Error('更新任务失败');
  } catch (error) {
    console.error('更新任务失败:', error);
    showNotification('更新任务失败，请重试');
  }
}

async function deleteTask(id) {
  if (!confirm('确定要删除这个任务吗？')) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('删除任务失败');
  } catch (error) {
    console.error('删除任务失败:', error);
    showNotification('删除任务失败，请重试');
  }
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket 已连接');
    updateConnectionStatus(true);
  };

  ws.onclose = () => {
    console.log('WebSocket 已断开，正在重连...');
    updateConnectionStatus(false);
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error);
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };
}

function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'task_created':
      tasks.unshift(message.task);
      showNotification('刚刚有人添加了新任务');
      break;
    case 'task_updated':
      const updateIndex = tasks.findIndex(t => t.id === message.task.id);
      if (updateIndex !== -1) {
        tasks[updateIndex] = message.task;
      }
      showNotification('刚刚有人更新了任务');
      break;
    case 'task_deleted':
      tasks = tasks.filter(t => t.id !== message.taskId);
      showNotification('刚刚有人删除了任务');
      break;
  }
  renderTasks();
}

addTaskBtn.addEventListener('click', addTask);

taskTitle.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

taskList.addEventListener('click', (e) => {
  if (e.target.classList.contains('task-status')) {
    toggleStatus(e.target.dataset.id);
  } else if (e.target.classList.contains('delete-btn')) {
    deleteTask(e.target.dataset.id);
  }
});

fetchTasks();
connectWebSocket();
