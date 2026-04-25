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

let transactions = [];
let auth0Client = null;
let token = null;

// Auth0 Configuration (Replace with real values later)
const AUTH0_DOMAIN = 'dev-oe7ona53ob3j1121.us.auth0.com';
const AUTH0_CLIENT_ID = 'doQTwqlGnwL6y5XO7GkFNPMhuVjtJNRm';

// Initialize Auth0
async function configureClient() {
  try {
    auth0Client = await createAuth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });

    // If returning from Auth0 login redirect
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

      // Load data
      getTransactions();
    } else {
      btnLogin.style.display = 'inline-block';
      btnLogout.style.display = 'none';
      userAvatar.style.display = 'none';

      // Load data without token (for local dev without Auth0 configured)
      getTransactions();
    }
  } catch (err) {
    console.error("Auth0 initialization failed, falling back to unauthenticated mode", err);
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
    logoutParams: {
      returnTo: window.location.origin
    }
  });
});

// Helper for authenticated fetch headers
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Fetch transactions from backend
async function getTransactions() {
  try {
    const res = await fetch('https://expense-tracker-backend-a49d.onrender.com/api/transactions', {
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

// Toggle Add Transaction Form
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

// Add transaction
async function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === '' || amount.value.trim() === '') {
    alert('Please add a text and amount');
    return;
  }

  let receiptUrl = null;

  // Handle file upload if present
  if (receiptInput.files.length > 0) {
    const formData = new FormData();
    formData.append('receipt', receiptInput.files[0]);

    try {
      toggleFormBtn.innerText = 'Uploading...';
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const uploadRes = await fetch('https://expense-tracker-backend-a49d.onrender.com/api/upload', {
        method: 'POST',
        headers: authHeaders, // FormData sets its own content type
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        receiptUrl = uploadData.imageUrl;
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload receipt, but will add transaction anyway.');
    }
  }

  const transactionData = {
    text: text.value,
    amount: +amount.value,
    receiptUrl: receiptUrl
  };

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

      text.value = '';
      amount.value = '';
      receiptInput.value = '';

      // Hide form after adding
      formContainer.style.display = 'none';
      toggleFormBtn.innerText = '+ New';
      toggleFormBtn.style.backgroundColor = 'var(--primary)';
    }
  } catch (err) {
    console.error('Error adding transaction:', err);
    toggleFormBtn.innerText = '+ New';
  }
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  // Get sign
  const sign = transaction.amount < 0 ? '-' : '+';
  const item = document.createElement('li');

  // Add class based on value
  item.classList.add('transaction-item');
  item.classList.add(transaction.amount < 0 ? 'exp' : 'inc');

  const receiptHtml = transaction.receiptUrl
    ? `<a href="${transaction.receiptUrl}" target="_blank" style="margin-left: 10px; font-size: 12px; color: var(--primary);">View Receipt</a>`
    : '';

  item.innerHTML = `
    <div class="transaction-info">
      <span class="transaction-text">${transaction.text} ${receiptHtml}</span>
      <span class="transaction-amount ${transaction.amount < 0 ? 'negative' : 'positive'}">
        ${sign}₹${Math.abs(transaction.amount).toFixed(2)}
      </span>
    </div>
    <button class="delete-btn" onclick="removeTransaction('${transaction._id}')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"></path>
      </svg>
    </button>
  `;

  list.appendChild(item);
}

// Update the balance, income and expense
function updateValues() {
  const amounts = transactions.map(transaction => transaction.amount);

  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);

  const income = amounts
    .filter(item => item > 0)
    .reduce((acc, item) => (acc += item), 0)
    .toFixed(2);

  const expense = (
    amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1
  ).toFixed(2);

  balance.innerText = `₹${total}`;
  money_plus.innerText = `+₹${income}`;
  money_minus.innerText = `-₹${expense}`;

  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state">No transactions yet. Add one!</div>';
  }
}

// Remove transaction by ID
window.removeTransaction = async function (id) {
  try {
    const res = await fetch(`https://expense-tracker-backend-a49d.onrender.com/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    const data = await res.json();

    if (data.success) {
      transactions = transactions.filter(transaction => transaction._id !== id);

      list.innerHTML = '';
      transactions.forEach(addTransactionDOM);
      updateValues();
    }
  } catch (err) {
    console.error('Error deleting transaction:', err);
  }
}

// Init app
function init() {
  list.innerHTML = '';
  transactions.forEach(addTransactionDOM);
  updateValues();
}

form.addEventListener('submit', addTransaction);

// Kick off Auth0 initialization
configureClient();
