import './style.css';
import { createAuth0Client } from '@auth0/auth0-spa-js';

// DOM Elements
const balance = document.getElementById('total-balance');
const money_plus = document.getElementById('total-income');
const money_minus = document.getElementById('total-expense');
const list = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const toggleFormBtn = document.getElementById('add-transaction-btn');
const formContainer = document.getElementById('add-transaction-form-container');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userAvatar = document.getElementById('user-avatar');
const receiptInput = document.getElementById('receipt');
const searchInput = document.getElementById('search-input'); // Added for Search

let transactions = [];
let auth0Client = null;
let token = null;

// Auth0 Configuration
const AUTH0_DOMAIN = 'dev-oe7ona53ob3j1121.us.auth0.com';
const AUTH0_CLIENT_ID = 'doQTwqlGnwL6y5XO7GkFNPMhuVjtJNRm';

// Initialize Auth0
async function configureClient() {
  try {
    auth0Client = await createAuth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin, 
        audience: "https://dev-oe7ona53ob3j1121.us.auth0.com/api/v2/"
      }
    });

    if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
      await auth0Client.handleRedirectCallback();
      window.history.replaceState({}, document.title, "/");
    }

    const isAuthenticated = await auth0Client.isAuthenticated();
    if (isAuthenticated) {
      const user = await auth0Client.getUser();
      userAvatar.src = user.picture || `https://ui-avatars.com/api/?name=${user.name}&background=random`;
      userAvatar.style.display = 'block';
      btnLogout.style.display = 'inline-block';
      btnLogin.style.display = 'none';

      try {
        token = await auth0Client.getTokenSilently();
      } catch (e) {
        console.log("Could not get Auth0 token silently");
      }

      getTransactions();
    } else {
      btnLogin.style.display = 'inline-block';
      btnLogout.style.display = 'none';
      userAvatar.style.display = 'none';
      getTransactions();
    }
  } catch (err) {
    console.error("Auth0 initialization failed", err);
    btnLogin.style.display = 'none';
    getTransactions();
  }
}

// Event Listeners for Auth
btnLogin.addEventListener('click', async () => {
  await auth0Client.loginWithRedirect();
});

btnLogout.addEventListener('click', () => {
  auth0Client.logout({
    logoutParams: { returnTo: window.location.origin }
  });
});

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function getTransactions() {
  try {
    const res = await fetch("https://expense-tracker-backend-a49d.onrender.com/api/transactions", {
      headers: getHeaders()
    });
    const data = await res.json();
    if (data.success) {
      transactions = data.data;
      init();
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
  }
}

toggleFormBtn.addEventListener('click', () => {
  if (formContainer.style.display === 'none') {
    formContainer.style.display = 'block';
    toggleFormBtn.innerText = 'Close';
    toggleFormBtn.style.backgroundColor = 'var(--text-muted)';
  } else {
    formContainer.style.display = 'none';
    toggleFormBtn.innerText = '+ New';
    toggleFormBtn.style.backgroundColor = 'var(--primary)';
  }
});

async function addTransaction(e) {
  e.preventDefault();
  if (text.value.trim() === '' || amount.value.trim() === '') {
    alert('Please add a text and amount');
    return;
  }

  let receiptUrl = null;
  if (receiptInput.files.length > 0) {
    const formData = new FormData();
    formData.append('receipt', receiptInput.files[0]);
    try {
      toggleFormBtn.innerText = 'Uploading...';
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const uploadRes = await fetch('https://expense-tracker-backend-a49d.onrender.com/api/upload', {
        method: 'POST',
        headers: authHeaders,
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        receiptUrl = uploadData.imageUrl;
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }

  const transactionData = { text: text.value, amount: +amount.value, receiptUrl: receiptUrl };

  try {
    const res = await fetch('https://expense-tracker-backend-a49d.onrender.com/api/transactions', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(transactionData)
    });
    const data = await res.json();
    if (data.success) {
      transactions.push(data.data);
      addTransactionDOM(data.data);
      updateValues();
      text.value = ''; amount.value = ''; receiptInput.value = '';
      formContainer.style.display = 'none';
      toggleFormBtn.innerText = '+ New';
      toggleFormBtn.style.backgroundColor = 'var(--primary)';
    }
  } catch (err) {
    console.error('Error adding transaction:', err);
    toggleFormBtn.innerText = '+ New';
  }
}

// Updated with DATE Formatting
function addTransactionDOM(transaction) {
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const sign = transaction.amount < 0 ? '-' : '+';
  const item = document.createElement('li');
  item.classList.add('transaction-item', transaction.amount < 0 ? 'exp' : 'inc');

  // Format Date for Display
  const dateObj = new Date(transaction.createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  const receiptHtml = transaction.receiptUrl
    ? `<a href="${transaction.receiptUrl}" target="_blank" style="margin-left: 10px; font-size: 12px; color: var(--primary);">View Receipt</a>`
    : '';

  item.innerHTML = `
    <div class="transaction-info">
      <span class="transaction-text">
        <strong>${transaction.text}</strong> ${receiptHtml}
        <br><small style="opacity: 0.6; font-size: 11px;">${formattedDate}</small>
      </span>
      <span class="transaction-amount ${transaction.amount < 0 ? 'negative' : 'positive'}">
        ${sign}₹${Math.abs(transaction.amount).toFixed(2)}
      </span>
    </div>
    <button class="delete-btn" onclick="removeTransaction('${transaction._id}')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"></path>
      </svg>
    </button>
  `;
  list.appendChild(item);
}

function updateValues() {
  const amounts = transactions.map(t => t.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
  const income = amounts.filter(i => i > 0).reduce((acc, item) => (acc += item), 0).toFixed(2);
  const expense = (amounts.filter(e => e < 0).reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);

  balance.innerText = `₹${total}`;
  money_plus.innerText = `+₹${income}`;
  money_minus.innerText = `-₹${expense}`;

  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state">No transactions yet. Add one!</div>';
  }
}

// Updated with DELETE Confirmation
window.removeTransaction = async function (id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  try {
    const res = await fetch(`https://expense-tracker-backend-a49d.onrender.com/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (data.success) {
      transactions = transactions.filter(t => t._id !== id);
      init();
    }
  } catch (err) {
    console.error('Error deleting transaction:', err);
  }
}

// Added SEARCH Logic
searchInput.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = transactions.filter(t => t.text.toLowerCase().includes(term));
  list.innerHTML = "";
  filtered.forEach(addTransactionDOM);
  if(filtered.length === 0) list.innerHTML = '<div class="empty-state">No matches found.</div>';
});

function init() {
  list.innerHTML = '';
  transactions.forEach(addTransactionDOM);
  updateValues();
}

form.addEventListener('submit', addTransaction);
configureClient();
