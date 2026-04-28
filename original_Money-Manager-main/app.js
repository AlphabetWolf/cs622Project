// ---------- Data layer ----------
const STORAGE_KEY = "money-manager-data";
const APP_VERSION = "0.5.0";
let currentMap = null;
let modalInitialized = false;
let currentTxIndex = -1;
let currentView = "transactions"; // Can be: transactions, charts, budgets, settings
let currentEditingAccountId = null;
let data = {
  balances: { cu: 0, revolut: 0, cash: 0 },
  accounts: [
    { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
    { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
    { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
  ],
  transactions: [],
  categories: [
    "Food & Dining",
    "Shopping",
    "Transportation",
    "Bills & Utilities",
    "Entertainment",
    "Health & Fitness",
    "Travel",
    "Education",
    "Personal Care",
    "Gifts",
    "Other",
  ],
  tags: [],
  budgets: {},
  settings: {
    theme: "light",
    accentColor: "#4a90e2",
    pinnedTransactions: [],
    recurringTransactions: [],
    version: "0.3.5",
    dashboard: {
      widgets: {
        totalBalance: true,
        accounts: true,
        recentTransactions: true,
        upcomingBills: false,
        spendingChart: false
      },
      defaultView: "transactions"
    },
    backup: {
      googleDrive: {
        connected: false,
        lastBackup: null
      }
    },
    recurring: {
      autoCreate: false,
      notifications: false
    }
  },
  bills: [
    // Default empty bills array
  ]
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
     const savedData = JSON.parse(saved);
     // Ensure backward compatibility with older data structure
     data = {
       balances: savedData.balances || { cu: 0, revolut: 0, cash: 0 },
       transactions: savedData.transactions || [],
       categories: savedData.categories || [
         "Food & Dining",
         "Shopping",
         "Transportation",
         "Bills & Utilities",
         "Entertainment",
         "Health & Fitness",
         "Travel",
         "Education",
         "Personal Care",
         "Gifts & Donations",
         "Income",
         "Other",
       ],
       budgets: savedData.budgets || {},
       settings: savedData.settings || {},
     };
     
     // Ensure all settings properties exist with defaults
     if (!data.settings) data.settings = {};
     if (!data.settings.theme) data.settings.theme = "light";
     if (!data.settings.accentColor) data.settings.accentColor = "#4a90e2";
     if (!data.settings.pinnedTransactions) data.settings.pinnedTransactions = [];
     if (!data.settings.recurringTransactions) data.settings.recurringTransactions = [];
     
     // Ensure dashboard settings
     if (!data.settings.dashboard) data.settings.dashboard = {};
     if (!data.settings.dashboard.widgets) data.settings.dashboard.widgets = {
       totalBalance: true,
       accounts: true,
       recentTransactions: true,
       upcomingBills: false,
       spendingChart: false
     };
     if (!data.settings.dashboard.defaultView) data.settings.dashboard.defaultView = "transactions";
     
     // Ensure backup settings
     if (!data.settings.backup) data.settings.backup = {};
     if (!data.settings.backup.googleDrive) data.settings.backup.googleDrive = {
       connected: false,
       lastBackup: null
     };
     
     // Ensure recurring settings
     if (!data.settings.recurring) data.settings.recurring = {
       autoCreate: false,
       notifications: false
     };
    
    // Add accounts array if upgrading from previous version
    if (!savedData.accounts) {
      // Create default accounts based on the existing balances
      data.accounts = [
        { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
        { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
        { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
      ];
      
      // Store the app version in settings
      data.settings.version = "0.3.5";
    } else {
      data.accounts = savedData.accounts;
    }

    // Migrate existing transactions to include new fields if they don't exist
    data.transactions = data.transactions.map((tx) => {
      return {
        ...tx,
        category: tx.category || (tx.type === "income" ? "Income" : "Other"),
        isRecurring: tx.isRecurring || false,
        isPinned: tx.isPinned || false,
        notes: tx.notes || "",
        attachments: tx.attachments || [],
      };
    });
    
    // Ensure all accounts have a color property
    // Add color property to accounts
    data.accounts = data.accounts.map(account => {
      if (!account.color) {
        // Assign default colors based on account type
        if (account.id === "cu") return { ...account, color: "#4a90e2" };
        if (account.id === "revolut") return { ...account, color: "#50c878" };
        if (account.id === "cash") return { ...account, color: "#ff9800" };
        // Random color for other accounts
        const defaultColors = ["#4a90e2", "#50c878", "#f44336", "#ff9800", "#9c27b0", "#795548"];
        const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];
        return { ...account, color: randomColor };
      }
      return account;
    });
  
    // Update account filter
    updateFilters();
    
    // Check for version upgrade
    if (data.settings.version !== APP_VERSION) {
      // Show upgrade notification
      showUpdateNotification(`Upgraded from v${data.settings.version} to v${APP_VERSION}`);
      data.settings.version = APP_VERSION;
      saveData();
    }
  }
  } catch (error) {
    console.error("Error loading data:", error);
    // Reset to default data if loading fails
    data = {
      balances: { cu: 0, revolut: 0, cash: 0 },
      transactions: [],
      accounts: [
        { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
        { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
        { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
      ],
      categories: [
        "Food & Dining",
        "Shopping",
        "Transportation",
        "Bills & Utilities",
        "Entertainment",
        "Health & Fitness",
        "Travel",
        "Education",
        "Personal Care",
        "Gifts",
        "Other",
      ],
      budgets: {},
      settings: {
        theme: "light",
        pinnedTransactions: [],
        recurringTransactions: [],
        version: APP_VERSION
      },
    };
    saveData();
  }

  // Apply theme and other settings
  applyAppSettings();

  // Store current app version
  localStorage.setItem("app-version", APP_VERSION);
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving data:", error);
    showUpdateNotification("Error saving data. Local storage may be full.");
  }
}

// Helper function to get today's date in YYYY-MM-DD format
function getTodayString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// ---------- UI rendering ----------
function formatAmt(a) {
  return "€" + a.toFixed(2);
}
function renderBalances() {
  // First render the account cards
  renderAccountCards();
  
  // Then update the balance values
  document.querySelectorAll(".card[data-account]").forEach((card) => {
    const acc = card.dataset.account;
    let balance = data.balances[acc] !== undefined ? data.balances[acc] : 0;
    card.querySelector(".balance").textContent = formatAmt(balance);
  });
  renderTotalBalance();
  
  // Update filters to include new accounts
  updateFilters();
}

function renderAccountCards() {
  const balancesSection = document.querySelector(".balances");
  balancesSection.innerHTML = "";
  
  // Safety check to ensure accounts array exists
  if (!data.accounts || !Array.isArray(data.accounts)) {
    // Initialize with default accounts if missing
    data.accounts = [
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
    ];
  }
  
  // Ensure tags array exists
  if (!data.tags || !Array.isArray(data.tags)) {
    data.tags = [];
  }
  
  // Ensure bills array exists
  if (!data.bills || !Array.isArray(data.bills)) {
    data.bills = [];
  }
  
  data.accounts.forEach(account => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-account", account.id);
    
    // Apply custom color if available
    if (account.color) {
      card.style.borderLeft = `4px solid ${account.color}`;
    }
    
    card.innerHTML = `
      <i class="fas fa-${account.icon} fa-2x" ${account.color ? `style="color:${account.color}"` : ''}></i>
      <div>
        <strong>${account.name}</strong>
        <p class="balance">€0.00</p>
      </div>
      <button class="edit-account-btn" data-id="${account.id}"><i class="fas fa-edit"></i></button>
    `;
    
    // Add click event listener for card selection
    card.addEventListener("click", function(e) {
      // Don't trigger if clicking the edit button
      if (e.target.closest('.edit-account-btn')) return;
      
      document.querySelectorAll(".card[data-account]").forEach(c => c.classList.remove("active"));
      this.classList.add("active");
      filters.account = this.dataset.account;
      renderTransactions();
    });
    
    // Add edit button click handler
    const editBtn = card.querySelector('.edit-account-btn');
    editBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      const accountId = this.getAttribute("data-id");
      openEditAccountModal(accountId);
    });
    
    balancesSection.appendChild(card);
  });
  
  // Add the "Add Account" card
  const addCard = document.createElement("div");
  addCard.className = "card add-account-card";
  addCard.id = "add-new-account-btn";
  addCard.innerHTML = `
    <i class="fas fa-plus fa-2x"></i>
    <div>
      <strong>Add Account</strong>
    </div>
  `;
  
  addCard.addEventListener("click", function() {
    openNewAccountModal();
  });
  
  balancesSection.appendChild(addCard);
}

// No longer needed - removed as part of the UI redesign

// Open modal to add a new account
function openNewAccountModal() {
  // Reset the form
  document.getElementById("new-account-name").value = "";
  document.getElementById("new-account-id").value = "";
  document.getElementById("new-account-icon").value = "university";
  document.getElementById("new-account-color").value = "#4a90e2";
  
  // Update the modal title and button
  document.querySelector("#accounts-modal h3").innerHTML = '<i class="fas fa-plus"></i> Add New Account';
  
  // Set the modal to add mode
  currentEditingAccountId = null;
  
  // Update button text
  document.getElementById("add-account-btn").innerHTML = '<i class="fas fa-save"></i> Add Account';
  
  // Hide the delete button
  document.getElementById("delete-account-container").classList.add("hidden");
  
  // Reset icon and color selections
  document.querySelectorAll('.icon-option').forEach(icon => icon.classList.remove('selected'));
  document.querySelectorAll('.icon-option')[0].classList.add('selected'); // Select first icon
  
  document.querySelectorAll('.color-option').forEach(color => color.classList.remove('selected'));
  document.querySelectorAll('.color-option')[0].classList.add('selected'); // Select first color
  
  // Reset the name input border
  const nameInput = document.getElementById("new-account-name");
  nameInput.style.borderLeft = "4px solid #4a90e2";
  
  // Show the modal
  document.getElementById("accounts-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  
  // Focus on the name input after a brief delay to ensure modal is visible
  setTimeout(() => {
    document.getElementById("new-account-name").focus();
  }, 50);
}

// Add or update an account
function saveAccount() {
  const nameInput = document.getElementById("new-account-name");
  const idInput = document.getElementById("new-account-id");
  const iconInput = document.getElementById("new-account-icon");
  const colorInput = document.getElementById("new-account-color");
  
  const name = nameInput.value.trim();
  let id = idInput.value.trim().toLowerCase();
  const icon = iconInput.value;
  const color = colorInput.value;
  
  // Validation
  if (!name) {
    nameInput.classList.add("input-error");
    nameInput.focus();
    showUpdateNotification("Please enter an account name");
    
    // Remove error class after a delay
    setTimeout(() => {
      nameInput.classList.remove("input-error");
    }, 2000);
    return;
  }
  
  // If adding a new account
  if (!currentEditingAccountId) {
    // Generate ID from name if not provided
    if (!id) {
      id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      // Ensure uniqueness
      let uniqueId = id;
      let counter = 1;
      while (data.accounts.some(account => account.id === uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter++;
      }
      id = uniqueId;
    }
    
    // Check if ID already exists
    if (data.accounts.some(account => account.id === id)) {
      idInput.classList.add("input-error");
      idInput.focus();
      showUpdateNotification(`Account ID "${id}" already exists. A unique ID will be generated for you.`);
      
      // Auto-generate a unique ID
      let uniqueId = id;
      let counter = 1;
      while (data.accounts.some(account => account.id === uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter++;
      }
      idInput.value = uniqueId;
      id = uniqueId;
      
      // Remove error class after a delay
      setTimeout(() => {
        idInput.classList.remove("input-error");
      }, 2000);
    }
    
    // Add the new account
    data.accounts.push({
      id: id,
      name: name,
      icon: icon,
      color: color
    });
    
    // Initialize balance for this account
    data.balances[id] = 0;
    
    // Show notification
    showUpdateNotification(`Account "${name}" added successfully`);
  } 
  // If editing an existing account
  else {
    const accountIndex = data.accounts.findIndex(a => a.id === currentEditingAccountId);
    if (accountIndex !== -1) {
      data.accounts[accountIndex].name = name;
      data.accounts[accountIndex].icon = icon;
      data.accounts[accountIndex].color = color;
      
      // Show notification
      showUpdateNotification(`Account "${name}" updated successfully`);
    }
  }
  
  // Save data and refresh UI
  saveData();
  renderAccountCards();
  renderBalances();
  renderTransactions();
  
  // Update transaction form account options
  updateAccountOptions();
  
  // Close the modal
  document.getElementById("accounts-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

// Open modal to edit an existing account
function openEditAccountModal(accountId) {
  // Safety check to ensure accounts array exists
  if (!data.accounts || !Array.isArray(data.accounts)) {
    data.accounts = [
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
    ];
  }
  
  const account = data.accounts.find(a => a.id === accountId);
  if (!account) return;
  
  currentEditingAccountId = accountId;
  
  // Update the modal title
  document.querySelector("#accounts-modal h3").innerHTML = '<i class="fas fa-edit"></i> Edit Account';
  
  // Fill the form with account data
  document.getElementById("new-account-name").value = account.name;
  document.getElementById("new-account-id").value = account.id;
  document.getElementById("new-account-icon").value = account.icon || "university";
  const accountColor = account.color || "#4a90e2";
  document.getElementById("new-account-color").value = accountColor;
  
  // Set the name input border color
  const nameInput = document.getElementById("new-account-name");
  nameInput.style.borderLeft = `4px solid ${accountColor}`;
  
  // Update button text
  document.getElementById("add-account-btn").innerHTML = '<i class="fas fa-save"></i> Update Account';
  
  // Show the delete button
  document.getElementById("delete-account-container").classList.remove("hidden");
  
  // Reset and set the selected icon
  document.querySelectorAll('.icon-option').forEach(icon => {
    icon.classList.remove('selected');
    if (icon.getAttribute('data-icon') === account.icon) {
      icon.classList.add('selected');
    }
  });
  
  // Reset and set the selected color
  document.querySelectorAll('.color-option').forEach(color => {
    color.classList.remove('selected');
    if (color.getAttribute('data-color') === account.color) {
      color.classList.add('selected');
    }
  });
  
  // If no color was selected (for older accounts), select the first one
  if (!document.querySelector('.color-option.selected')) {
    document.querySelectorAll('.color-option')[0].classList.add('selected');
  }
  
  // Show the modal
  document.getElementById("accounts-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  
  // Focus on the name input after a brief delay to ensure modal is visible
  setTimeout(() => {
    document.getElementById("new-account-name").focus();
  }, 50);
}

// Delete an account
function deleteAccount() {
  if (!currentEditingAccountId) return;
  
  // Safety check to ensure accounts array exists
  if (!data.accounts || !Array.isArray(data.accounts)) {
    data.accounts = [
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
    ];
  }
  
  // Can't delete if it's the only account
  if (data.accounts.length <= 1) {
    alert("You must have at least one account. Create a new account before deleting this one.");
    return;
  }
  
  const account = data.accounts.find(a => a.id === currentEditingAccountId);
  if (!account) return;
  
  // Confirm deletion
  if (!confirm(`Are you sure you want to delete the "${account.name}" account? All transactions for this account will remain but will be labeled as "Unknown Account".`)) {
    return;
  }
  
  // Find the account to delete
  const accountIndex = data.accounts.findIndex(a => a.id === currentEditingAccountId);
  if (accountIndex === -1) return;
  
  // Handle existing transactions
  data.transactions.forEach(tx => {
    if (tx.account === currentEditingAccountId) {
      tx.account = "unknown";
    }
  });
  
  // Remove the account
  const accountName = data.accounts[accountIndex].name;
  data.accounts.splice(accountIndex, 1);
  
  // Remove the balance
  const oldBalance = data.balances[currentEditingAccountId] || 0;
  delete data.balances[currentEditingAccountId];
  
  // Save data and refresh UI
  saveData();
  renderAccountCards();
  renderBalances();
  renderTransactions();
  
  // Update transaction form account options
  updateAccountOptions();
  
  // Close the modal
  document.getElementById("accounts-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  
  // Reset the current editing ID
  currentEditingAccountId = null;
  
  // Show notification
  showUpdateNotification(`Account "${accountName}" deleted. Balance of ${formatAmt(oldBalance)} was removed.`);
}

// Cancel account editing/adding and close the modal
function cancelAccountModal() {
  currentEditingAccountId = null;
  // Hide the modal
  document.getElementById("accounts-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

// Initialize account management UI
function initAccountManagement() {
  // Setup icon option click handlers
  document.querySelectorAll('.icon-option').forEach(option => {
    option.addEventListener('click', function() {
      // Remove selected class from all options
      document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to this option
      this.classList.add('selected');
      
      // Update the hidden input
      document.getElementById('new-account-icon').value = this.getAttribute('data-icon');
    });
  });
  
  // Setup color option click handlers
  document.querySelectorAll('.color-option').forEach(option => {
    // Set the background color based on the data-color attribute
    option.style.backgroundColor = option.getAttribute('data-color');
    
    option.addEventListener('click', function() {
      const color = this.getAttribute('data-color');
      
      // Remove selected class from all options
      document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to this option
      this.classList.add('selected');
      
      // Update the hidden input
      document.getElementById('new-account-color').value = color;
      
      // Update the name input border to reflect selected color
      const nameInput = document.getElementById('new-account-name');
      nameInput.style.borderLeft = `4px solid ${color}`;
    });
  });
  
  // Select first options by default
  if (document.querySelectorAll('.icon-option').length > 0) {
    document.querySelectorAll('.icon-option')[0].classList.add('selected');
    document.getElementById('new-account-icon').value = document.querySelectorAll('.icon-option')[0].getAttribute('data-icon');
  }
  
  if (document.querySelectorAll('.color-option').length > 0) {
    document.querySelectorAll('.color-option')[0].classList.add('selected');
    const defaultColor = document.querySelectorAll('.color-option')[0].getAttribute('data-color');
    document.getElementById('new-account-color').value = defaultColor;
    
    // Set initial color on name input
    const nameInput = document.getElementById('new-account-name');
    nameInput.style.borderLeft = `4px solid ${defaultColor}`;
  }
  
  // Add input event listener for the account name field
  const nameInput = document.getElementById('new-account-name');
  if (nameInput) {
    nameInput.addEventListener('input', function() {
      if (this.classList.contains('input-error')) {
        this.classList.remove('input-error');
      }
    });
  }
}

// Show a temporary notification message
function showUpdateNotification(message) {
  const notification = document.createElement("div");
  notification.className = "update-notification";
  notification.innerHTML = `
    <div class="update-content">
      <i class="fas fa-info-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Fade out after a few seconds
  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

function renderTotalBalance() {
  // Ensure balances object exists
  if (!data.balances) {
    data.balances = { cu: 0, revolut: 0, cash: 0 };
  }
  
  const total = Object.values(data.balances).reduce(
    (sum, balance) => sum + balance,
    0
  );
  document.getElementById("total-balance").textContent = formatAmt(total);
}

// Get account color by account ID
function getAccountColor(accountId) {
  // Safety check to ensure accounts array exists
  if (!data.accounts || !Array.isArray(data.accounts)) {
    return '#607d8b'; // Default color if accounts array is missing
  }
  const account = data.accounts.find(a => a.id === accountId);
  return account && account.color ? account.color : '#607d8b'; // Default color for unknown accounts
}

// Update filter options based on current data
function updateFilters() {
  const accountFilter = document.getElementById("account-filter");
  if (!accountFilter) return;
  
  // Update account filter options
  updateAccountOptions();
  
  // Select the appropriate option based on current filter state
  if (filters.account && filters.account !== "all") {
    if (accountFilter.querySelector(`option[value="${filters.account}"]`)) {
      accountFilter.value = filters.account;
    } else {
      filters.account = "all";
      accountFilter.value = "all";
    }
  }
  
  // Make sure the rendered transactions reflect the filter changes
  renderTransactions();
}

// Update account options in all forms and filters
function updateAccountOptions() {
  // Get references to select elements
  const txAccount = document.getElementById("tx-account");
  const editTxAccount = document.getElementById("edit-tx-account");
  const accountFilter = document.getElementById("account-filter");
  
  // Safety check - exit if elements don't exist
  if (!txAccount || !editTxAccount) return;
  
  // Safety check to ensure accounts array exists
  if (!data.accounts || !Array.isArray(data.accounts)) {
    // Initialize with default accounts if missing
    data.accounts = [
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
    ];
  }
  
  // Clear existing options
  txAccount.innerHTML = '';
  editTxAccount.innerHTML = '';
  
  // For the filter, we want to keep the 'All Accounts' option
  if (accountFilter) {
    // Save the 'All Accounts' option
    const allOption = accountFilter.querySelector('option[value="all"]');
    accountFilter.innerHTML = '';
    if (allOption) {
      accountFilter.appendChild(allOption);
    } else {
      const option = document.createElement("option");
      option.value = "all";
      option.textContent = "All Accounts";
      accountFilter.appendChild(option);
    }
  }
  
  // Add options for each account
  data.accounts.forEach(account => {
    const option1 = document.createElement("option");
    option1.value = account.id;
    option1.textContent = account.name;
    
    const option2 = document.createElement("option");
    option2.value = account.id;
    option2.textContent = account.name;
    
    txAccount.appendChild(option1);
    editTxAccount.appendChild(option2);
    
    // Add to filter if it exists
    if (accountFilter) {
      const option3 = document.createElement("option");
      option3.value = account.id;
      option3.textContent = account.name;
      accountFilter.appendChild(option3);
    }
  });
}
// Global filters and sort state
let filters = {
  account: "all",
  type: "all",
};
let sortOrder = "date-desc";

function renderTransactions() {
  const ul = document.getElementById("tx-list");
  ul.innerHTML = "";

  // Filter transactions
  let filteredTransactions = data.transactions.filter((tx) => {
    if (filters.account !== "all" && tx.account !== filters.account)
      return false;
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    return true;
  });

  // Sort transactions
  switch (sortOrder) {
    case "date-desc":
      filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "date-asc":
      filteredTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "amount-desc":
      filteredTransactions.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      filteredTransactions.sort((a, b) => a.amount - b.amount);
      break;
  }

  // Check for pinned transactions first
  const pinnedTransactions = filteredTransactions.filter((tx) => tx.isPinned);
  const regularTransactions = filteredTransactions.filter((tx) => !tx.isPinned);

  // Process pinned transactions first, then regular ones
  [...pinnedTransactions, ...regularTransactions].forEach((tx) => {
    const li = document.createElement("li");
    li.setAttribute("data-account", tx.account);
    li.setAttribute(
      "data-id",
      tx.id || "tx-" + Math.random().toString(36).substr(2, 9),
    );

    // Add class for pinned transactions
    if (tx.isPinned) {
      li.classList.add("pinned");
    }

    // Add recurring indicator if applicable
    const recurringIcon = tx.isRecurring
        ? `<i class="fas fa-sync-alt recurring-icon" title="Recurring Transaction"></i>`
        : "";
  
    // Render tags if any
    const tagsList = tx.tags && tx.tags.length > 0 
        ? `<div class="tx-tags">${tx.tags.map(tag => `<span class="tx-tag">${tag}</span>`).join('')}</div>` 
        : '';

      li.innerHTML = `
        <span>
          <i class="fas fa-${tx.type === "expense" ? "arrow-down" : "arrow-up"}"
             style="color: var(--${tx.type}-color);"></i>
          <span class="account-dot" style="background-color: ${getAccountColor(tx.account)};"></span>
          ${tx.description || "(no desc)"}
          ${recurringIcon}
          ${tagsList}
        </span>
        <span>${formatAmt(tx.amount)}</span>
      `;
    li.addEventListener("click", function () {
      const index = data.transactions.findIndex(
        (t) =>
          t.date === tx.date &&
          t.amount === tx.amount &&
          t.description === tx.description &&
          t.type === tx.type &&
          t.account === tx.account,
      );
      currentTxIndex = index;

      const modal = document.getElementById("transaction-modal");
      const info = document.getElementById("tx-info");
      const mapPreview = document.getElementById("map-preview");

      let detailsHtml =
        "<p><strong>Description:</strong> " +
        (tx.description || "(no desc)") +
        "</p>" +
        "<p><strong>Account:</strong> " +
        (tx.account === "cu"
          ? "Credit Union"
          : tx.account === "revolut"
            ? "Revolut"
            : "Cash") +
        "</p>" +
        "<p><strong>Type:</strong> " +
        tx.type +
        "</p>" +
        "<p><strong>Amount:</strong> " +
        formatAmt(tx.amount) +
        "</p>" +
        "<p><strong>Date:</strong> " +
        tx.date +
        "</p>" +
        "<p><strong>Category:</strong> " +
        (tx.category || "Uncategorized") +
        "</p>";

      // Add recurring info if applicable
      if (tx.isRecurring) {
        detailsHtml += "<p><strong>Recurring:</strong> Yes</p>";
      }

      // Add notes if available
      if (tx.notes && tx.notes.trim() !== "") {
        detailsHtml += "<p><strong>Notes:</strong> " + tx.notes + "</p>";
      }

      // Add attachments if available
      if (tx.attachments && tx.attachments.length > 0) {
        detailsHtml +=
          "<div class='attachment-section'><strong>Attachments:</strong><div class='attachment-list'>";
        tx.attachments.forEach((attachment) => {
          detailsHtml += `<div class='attachment-item'><img src='${attachment.data}' alt='Receipt'></div>`;
        });
        detailsHtml += "</div></div>";
      }
      info.innerHTML = detailsHtml;

      // Clear previous map
      mapPreview.innerHTML = "";
      if (currentMap) {
        currentMap.remove();
        currentMap = null;
      }

      // Store current scroll position before opening modal
      const scrollPos = window.scrollY;
      modal.classList.remove("hidden");
      document.body.classList.add("modal-open");
      // Store scroll position as data attribute on modal
      modal.dataset.scrollPosition = scrollPos;

      // Initialize map after modal is visible
      setTimeout(() => {
        if (tx.location) {
          try {
            currentMap = L.map("map-preview").setView(
              [tx.location.latitude, tx.location.longitude],
              13,
            );
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "&copy; OpenStreetMap contributors",
            }).addTo(currentMap);
            L.marker([tx.location.latitude, tx.location.longitude]).addTo(
              currentMap,
            );
            // Force map to recalculate size
            currentMap.invalidateSize();
          } catch (e) {
            console.error("Error initializing map:", e);
            mapPreview.innerHTML =
              "<div class='no-location'>Error loading map</div>";
          }
        } else {
          mapPreview.innerHTML =
            "<div class='no-location'>No location data available</div>";
        }
      }, 100);
    });
    ul.appendChild(li);
  });

  // Display message if no transactions match filters
  if (filteredTransactions.length === 0) {
    ul.innerHTML =
      "<li class='no-transactions'>No transactions match your filters</li>";
  }
}

// ---------- Modal/Form logic ----------
const modal = document.getElementById("tx-modal");
document.getElementById("add-btn").onclick = () =>
  modal.classList.remove("hidden");
document.getElementById("cancel-btn").onclick = () =>
  modal.classList.add("hidden");

// Initialize the transaction form
document.getElementById("tx-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const amt = parseFloat(document.getElementById("tx-amount").value);
  const acc = document.getElementById("tx-account").value;
  const type = document.getElementById("tx-type").value;
  const desc = document.getElementById("tx-desc").value;
  const date = document.getElementById("tx-date").value;
  const category = document.getElementById("tx-category").value;
  const isRecurring = document.getElementById("tx-recurring").checked;
  const isPinned = document.getElementById("tx-pinned").checked;
  const notes = document.getElementById("tx-notes").value;
  
  // Get tags if they exist
  let tags = [];
  const tagsInput = document.getElementById("tx-tags");
  if (tagsInput && tagsInput.value) {
    tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  const fileInput = document.getElementById("tx-attachment");

  // Generate a unique ID for the transaction
  const txId = "tx-" + Math.random().toString(36).substr(2, 9);

  let transaction = {
    id: txId,
    amount: amt,
    account: acc,
    type,
    description: desc,
    date,
    category,
    isRecurring,
    isPinned,
    notes,
    attachments: [],
  };

  const completeTransaction = (location, attachments = []) => {
    if (location) {
      transaction.location = location;
    }

    if (attachments && attachments.length > 0) {
      transaction.attachments = attachments;
    }

    data.transactions.push(transaction);
    data.balances[acc] += type === "expense" ? -amt : amt;

    // Handle pinned status
    if (isPinned) {
      data.settings.pinnedTransactions.push(txId);
    }

    // Handle recurring transactions
    if (isRecurring) {
      // Add to recurring transactions with scheduling info
      data.settings.recurringTransactions.push({
        transactionId: txId,
        schedule: "monthly", // Default to monthly
        nextDueDate: new Date(date).setMonth(new Date(date).getMonth() + 1), // Next month
      });
    }

    saveData();
    renderBalances();
    renderTransactions();
    renderTotalBalance();
    updateCharts();
    modal.classList.add("hidden");
    e.target.reset();

    // Clear attachment preview
    document.getElementById("tx-attachments-preview").innerHTML = "";
  };

  // Process attachments if any
  if (fileInput.files.length > 0) {
    processAttachments(fileInput.files).then((attachments) => {
      // Request geolocation if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (position) {
            completeTransaction(
              {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
              attachments,
            );
          },
          function (error) {
            console.log("Location error or permission denied:", error);
            completeTransaction(null, attachments);
          },
        );
      } else {
        completeTransaction(null, attachments);
      }
    });
  } else {
    // No attachments, proceed with geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          completeTransaction({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        function (error) {
          console.log("Location error or permission denied:", error);
          completeTransaction(null);
        },
      );
    } else {
      completeTransaction(null);
    }
  }
});

// Delete a transaction
function deleteTransaction(index) {
  if (index < 0 || index >= data.transactions.length) return;

  const tx = data.transactions[index];
  // Reverse the effect on balance
  data.balances[tx.account] -= tx.type === "expense" ? -tx.amount : tx.amount;

  // If it's a pinned transaction, remove from pinned list
  if (tx.isPinned) {
    const txId = tx.id || index;
    data.settings.pinnedTransactions = data.settings.pinnedTransactions.filter(
      (id) => id !== txId,
    );
  }

  // Remove the transaction
  data.transactions.splice(index, 1);

  // Save and update UI
  saveData();
  renderBalances();
  renderTransactions();
  renderTotalBalance();
  updateCharts();

  // Hide modal
  document.getElementById("transaction-modal").classList.add("hidden");
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
}

// Open edit transaction modal and populate with transaction data
function openEditTransactionModal(index) {
  if (index < 0 || index >= data.transactions.length) return;

  const tx = data.transactions[index];

  // Populate the edit form with transaction data
  document.getElementById("edit-tx-amount").value = tx.amount;
  document.getElementById("edit-tx-account").value = tx.account;
  document.getElementById("edit-tx-type").value = tx.type;
  document.getElementById("edit-tx-desc").value = tx.description || "";
  document.getElementById("edit-tx-date").value = tx.date;
  document.getElementById("edit-tx-category").value = tx.category || "Other";
  document.getElementById("edit-tx-recurring").checked =
    tx.isRecurring || false;
  document.getElementById("edit-tx-pinned").checked = tx.isPinned || false;
  document.getElementById("edit-tx-notes").value = tx.notes || "";

  // Display existing attachments if any
  const attachmentContainer = document.getElementById(
    "edit-tx-attachments-preview",
  );
  attachmentContainer.innerHTML = "";
  if (tx.attachments && tx.attachments.length > 0) {
    tx.attachments.forEach((attachment, i) => {
      const img = document.createElement("div");
      img.className = "attachment-preview";
      img.innerHTML = `
        <img src="${attachment.data}" alt="Attachment ${i + 1}">
        <button type="button" class="remove-attachment" data-index="${i}">×</button>
      `;
      attachmentContainer.appendChild(img);
    });

    // Add event listeners to remove buttons
    attachmentContainer
      .querySelectorAll(".remove-attachment")
      .forEach((btn) => {
        btn.addEventListener("click", function () {
          const attachmentIndex = parseInt(this.dataset.index);
          // We'll update the attachments array in the saveEditedTransaction function
          this.parentElement.remove();
        });
      });
  }

  // Hide transaction modal and show edit modal
  document.getElementById("transaction-modal").classList.add("hidden");
  document.getElementById("edit-tx-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");

  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
}

// Save edited transaction
function saveEditedTransaction() {
  if (currentTxIndex < 0 || currentTxIndex >= data.transactions.length) return;

  const oldTx = data.transactions[currentTxIndex];

  // Get values from edit form
  const newAmount = parseFloat(document.getElementById("edit-tx-amount").value);
  const newAccount = document.getElementById("edit-tx-account").value;
  const newType = document.getElementById("edit-tx-type").value;
  const newDesc = document.getElementById("edit-tx-desc").value;
  const newDate = document.getElementById("edit-tx-date").value;
  const newCategory = document.getElementById("edit-tx-category").value;
  const isRecurring = document.getElementById("edit-tx-recurring").checked;
  const isPinned = document.getElementById("edit-tx-pinned").checked;
  const notes = document.getElementById("edit-tx-notes").value;

  // Handle attachments - get existing ones minus any that were removed
  const existingAttachments = [...(oldTx.attachments || [])];
  const removedIndices = Array.from(
    document.querySelectorAll(".remove-attachment"),
  ).map((el) => parseInt(el.dataset.index));

  // Filter out removed attachments
  const remainingAttachments = existingAttachments.filter(
    (_, i) => !removedIndices.includes(i),
  );

  // Add any new attachments from the file input
  const fileInput = document.getElementById("edit-tx-attachment");
  const newAttachments = [];
  if (fileInput.files.length > 0) {
    // We'll process these asynchronously, so we need to save the promise
    const attachmentPromise = processAttachments(fileInput.files).then(
      (attachments) => {
        // Combine remaining and new attachments
        const allAttachments = [...remainingAttachments, ...attachments];

        // First, reverse the effect of the original transaction on the balance
        data.balances[oldTx.account] -=
          oldTx.type === "expense" ? -oldTx.amount : oldTx.amount;

        // Then, apply the effect of the new transaction values
        data.balances[newAccount] +=
          newType === "expense" ? -newAmount : newAmount;

        // Update the transaction object with all fields
        const txId =
          oldTx.id || "tx-" + Math.random().toString(36).substr(2, 9);

        // Update the transaction object
        const updatedTx = {
          id: txId,
          amount: newAmount,
          account: newAccount,
          type: newType,
          description: newDesc,
          date: newDate,
          category: newCategory,
          isRecurring,
          isPinned,
          notes,
          location: oldTx.location, // Preserve original location data
          attachments: allAttachments,
        };

        // Handle pinned status changes
        if (isPinned && !oldTx.isPinned) {
          // Add to pinned list
          if (!data.settings.pinnedTransactions.includes(txId)) {
            data.settings.pinnedTransactions.push(txId);
          }
        } else if (!isPinned && oldTx.isPinned) {
          // Remove from pinned list
          data.settings.pinnedTransactions =
            data.settings.pinnedTransactions.filter((id) => id !== txId);
        }

        // Replace the transaction in the array
        data.transactions[currentTxIndex] = updatedTx;

        // Save and update UI
        saveData();
        renderBalances();
        renderTransactions();
        renderTotalBalance();
        updateCharts();

        // Hide reset modal
        document.getElementById("reset-confirm-modal").classList.add("hidden");
        document.body.classList.remove("modal-open");
      },
    );

    return; // Exit early, the promise will handle the rest
  }

  // If no new attachments, we can update synchronously
  // First, reverse the effect of the original transaction on the balance
  data.balances[oldTx.account] -=
    oldTx.type === "expense" ? -oldTx.amount : oldTx.amount;

  // Then, apply the effect of the new transaction values
  data.balances[newAccount] += newType === "expense" ? -newAmount : newAmount;

  // Ensure transaction has an ID
  const txId = oldTx.id || "tx-" + Math.random().toString(36).substr(2, 9);

  // Update the transaction object with all fields
  const updatedTx = {
    id: txId,
    amount: newAmount,
    account: newAccount,
    type: newType,
    description: newDesc,
    date: newDate,
    category: newCategory,
    isRecurring,
    isPinned,
    notes,
    tags,
    location: oldTx.location, // Preserve original location data
    attachments: remainingAttachments,
  };

  // Handle pinned status changes
  if (isPinned && !oldTx.isPinned) {
    // Add to pinned list
    if (!data.settings.pinnedTransactions.includes(txId)) {
      data.settings.pinnedTransactions.push(txId);
    }
  } else if (!isPinned && oldTx.isPinned) {
    // Remove from pinned list
    data.settings.pinnedTransactions = data.settings.pinnedTransactions.filter(
      (id) => id !== txId,
    );
  }

  // Replace the transaction in the array
  data.transactions[currentTxIndex] = updatedTx;

  // Save and update UI
  saveData();
  renderBalances();
  renderTransactions();
  renderTotalBalance();
  updateCharts();

  // Hide edit modal
  document.getElementById("edit-tx-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

// Reset all data
function resetAllData() {
  // Show custom confirmation modal instead of browser confirm
  document.getElementById("reset-confirm-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function confirmReset() {
  // Reset to default data structure with proper initialization
  data = {
    balances: { cu: 0, revolut: 0, cash: 0 },
    transactions: [],
    accounts: [
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
    ],
    categories: [
      "Food & Dining",
      "Shopping",
      "Transportation",
      "Bills & Utilities",
      "Entertainment",
      "Health & Fitness",
      "Travel",
      "Education",
      "Personal Care",
      "Gifts",
      "Other",
    ],
    tags: [],
    bills: [],
    budgets: {},
    settings: {
      theme: "light",
      accentColor: "#4a90e2",
      pinnedTransactions: [],
      recurringTransactions: [],
      version: APP_VERSION,
      dashboard: {
        widgets: {
          totalBalance: true,
          accounts: true,
          recentTransactions: true,
          upcomingBills: false,
          spendingChart: false
        },
        defaultView: "transactions"
      },
      backup: {
        googleDrive: {
          connected: false,
          lastBackup: null
        }
      },
      recurring: {
        autoCreate: false,
        notifications: false
      }
    },
  };
  saveData();
  renderBalances();
  renderTransactions();
  renderTotalBalance();
  document.getElementById("reset-confirm-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  
  // Show confirmation
  showUpdateNotification("All data has been reset successfully");
}

// Balance over time chart
function initBalanceOverTimeChart() {
  // Set up event listeners for chart controls
  document
    .getElementById("balance-timespan")
    .addEventListener("change", updateBalanceOverTimeChart);
  document
    .getElementById("balance-account")
    .addEventListener("change", updateBalanceOverTimeChart);

  // Initial chart update
  updateBalanceOverTimeChart();
}

function updateBalanceOverTimeChart() {
  // Get selected timespan and account
  const timespan = document.getElementById("balance-timespan").value;
  const account = document.getElementById("balance-account").value;

  // Get current date
  const now = new Date();

  // Determine date range based on timespan
  let startDate,
    endDate = new Date();
  let interval = "day";

  switch (timespan) {
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      interval = "day";
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      interval = "day";
      break;
    case "quarter":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      interval = "week";
      break;
    case "year":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      interval = "month";
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      interval = "day";
  }

  // Create array of dates from start to end based on interval
  const dates = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));

    switch (interval) {
      case "day":
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        current.setDate(current.getDate() + 7);
        break;
      case "month":
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  // Calculate balance at each date point
  const balances = [];

  // For each date, calculate the balance based on all transactions up to that date
  dates.forEach((date) => {
    // Filter transactions up to this date
    const txUpToDate = data.transactions.filter(
      (tx) => new Date(tx.date) <= date,
    );

    // Calculate balance for the selected account or all accounts (total)
    if (account === "all") {
      // Calculate total balance across all accounts
      const totalBalance = Object.values(data.balances).reduce(
        (sum, bal) => sum + bal,
        0,
      );

      // Adjust for transactions not included in the current date
      const futureTransactions = data.transactions.filter(
        (tx) => new Date(tx.date) > date,
      );

      // Calculate the effect of future transactions on the balance
      const adjustment = futureTransactions.reduce((sum, tx) => {
        return sum + (tx.type === "expense" ? tx.amount : -tx.amount);
      }, 0);

      // Add adjusted balance to array
      balances.push(totalBalance - adjustment);
    } else {
      // Calculate balance for specific account
      let accountBalance = data.balances[account] || 0;

      // Adjust for transactions not included in the current date
      const futureTransactions = data.transactions.filter(
        (tx) => tx.account === account && new Date(tx.date) > date,
      );

      // Calculate the effect of future transactions on the balance
      const adjustment = futureTransactions.reduce((sum, tx) => {
        return sum + (tx.type === "expense" ? tx.amount : -tx.amount);
      }, 0);

      // Add adjusted balance to array
      balances.push(accountBalance - adjustment);
    }
  });

  // Format dates for display
  const formatDate = (date) => {
    switch (interval) {
      case "day":
        return date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
      case "week":
        return date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
      case "month":
        return date.toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        });
    }
  };

  // Format labels
  const labels = dates.map(formatDate);

  // Get the chart canvas
  const ctx = document
    .getElementById("balance-over-time-chart")
    .getContext("2d");

  // Destroy existing chart if it exists
  if (window.balanceOverTimeChart) {
    window.balanceOverTimeChart.destroy();
  }

  // Determine chart title based on account selection
  let chartTitle = "Balance Over Time";
  if (account !== "all") {
    chartTitle += ` - ${account === "cu" ? "Credit Union" : account === "revolut" ? "Revolut" : "Cash"}`;
  }

  // Get account color based on selection
  const chartColor =
    account === "all"
      ? "#4a90e2"
      : account === "cu"
        ? "#6a75ca"
        : account === "revolut"
          ? "#f37736"
          : "#4caf50";

  // Create chart
  window.balanceOverTimeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Balance",
          data: balances,
          backgroundColor: `${chartColor}33`,
          borderColor: chartColor,
          borderWidth: 2,
          fill: true,
          tension: 0.2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: chartTitle,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Balance: ${formatAmt(context.raw)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function (value) {
              return formatAmt(value);
            },
          },
        },
      },
    },
  });
}

// Check for updates
function checkForUpdates() {
  const storedVersion = localStorage.getItem("app-version") || "0.0.0";

  if (storedVersion !== APP_VERSION) {
    // Show update notification
    const notification = document.createElement("div");
    notification.className = "update-notification";
    notification.innerHTML = `
      <div class="update-content">
        <i class="fas fa-info-circle"></i>
        <span>New version available (${APP_VERSION}). Refreshing...</span>
      </div>
    `;
    document.body.appendChild(notification);

    // Update stored version and reload after a short delay
    localStorage.setItem("app-version", APP_VERSION);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } else {
    // Show "up to date" notification
    const notification = document.createElement("div");
    notification.className = "update-notification";
    notification.innerHTML = `
      <div class="update-content">
        <i class="fas fa-check-circle"></i>
        <span>App is up to date (v${APP_VERSION})</span>
      </div>
    `;
    document.body.appendChild(notification);

    // Remove notification after a few seconds
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 2000);
  }
}

// ---------- Init ----------
// Process attachments (photos) for transactions
function processAttachments(files) {
  return new Promise((resolve, reject) => {
    const attachments = [];
    let processed = 0;

    if (files.length === 0) {
      resolve(attachments);
      return;
    }

    Array.from(files).forEach((file) => {
      // Only process image files
      if (!file.type.match("image.*")) {
        processed++;
        if (processed === files.length) {
          resolve(attachments);
        }
        return;
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
        });

        processed++;
        if (processed === files.length) {
          resolve(attachments);
        }
      };

      reader.onerror = function () {
        processed++;
        if (processed === files.length) {
          resolve(attachments);
        }
      };

      reader.readAsDataURL(file);
    });
  });
}

// Apply theme (light/dark)
function applyTheme(theme) {
  if (theme === 'system') {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
    
    // Listen for changes in system preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (data.settings.theme === 'system') {
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
      }
    });
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  
  data.settings.theme = theme;
}

function toggleTheme() {
  const currentTheme = data.settings.theme || "light";
  let newTheme;
  
  switch (currentTheme) {
    case "light":
      newTheme = "dark";
      break;
    case "dark":
      newTheme = "system";
      break;
    default:
      newTheme = "light";
  }
  
  applyTheme(newTheme);
  saveData();
  
  // Update theme buttons in settings if they exist
  updateThemeButtons();
}

// Apply all app settings
function applyAppSettings() {
  // Apply theme
  applyTheme(data.settings.theme || "light");
  
  // Apply accent color
  document.documentElement.style.setProperty('--primary-color', data.settings.accentColor || '#4a90e2');
  document.documentElement.style.setProperty('--primary-dark', adjustColor(data.settings.accentColor || '#4a90e2', -20));
  document.documentElement.style.setProperty('--primary-light', adjustColor(data.settings.accentColor || '#4a90e2', 40, true));
  
  // Apply dashboard widgets
  applyDashboardWidgets();
  
  // Update app version display
  const versionElement = document.getElementById("app-version");
  if (versionElement) {
    versionElement.textContent = APP_VERSION;
  }
  
  // Calculate storage usage
  calculateStorageUsage();
}

// Helper function to adjust color brightness
function adjustColor(hexColor, amount, lighten = false) {
  // Convert hex to RGB
  let r = parseInt(hexColor.substring(1,3), 16);
  let g = parseInt(hexColor.substring(3,5), 16);
  let b = parseInt(hexColor.substring(5,7), 16);

  // Adjust brightness
  if (lighten) {
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
  } else {
    r = Math.max(0, r + amount);
    g = Math.max(0, g + amount);
    b = Math.max(0, b + amount);
  }
  
  // Convert back to hex
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Apply dashboard widget settings
function applyDashboardWidgets() {
  // Widget settings are guaranteed to exist thanks to loadData initialization
  const widgets = data.settings.dashboard.widgets;
  
  // Total balance widget
  const totalBalanceWidget = document.querySelector(".total-balance.card");
  if (totalBalanceWidget) {
    totalBalanceWidget.style.display = widgets.totalBalance ? "block" : "none";
  }
  
  // Accounts widget
  const accountsSection = document.querySelector(".balances");
  if (accountsSection) {
    accountsSection.style.display = widgets.accounts ? "flex" : "none";
  }
  
  // Recent transactions widget (main transaction list)
  // This is always shown on the transactions view
  
  // Set default view on page load
  if (data.settings.dashboard.defaultView && currentView === "transactions") {
    // Only switch if we're on the initial transactions view
    switchView(data.settings.dashboard.defaultView);
  }
}

// Initialize the settings view
function initSettingsView() {
  // Set app version
  document.getElementById("app-version").textContent = APP_VERSION;
  
  // Calculate storage usage
  calculateStorageUsage();
  
  // Initialize theme buttons
  updateThemeButtons();
  
  // Initialize accent color selector
  initColorSelector();
  
  // Initialize widget checkboxes
  initWidgetCheckboxes();
  
  // Initialize default view selector
  initDefaultViewSelector();
  
  // Initialize Google Drive functionality
  initGoogleDriveBackup();
  
  // Initialize local backup buttons
  initLocalBackupButtons();
  
  // Initialize tags list
  renderTagsList();
  
  // Initialize recurring transaction settings
  initRecurringSettings();
  
  // Add tag button event listener
  document.getElementById("add-tag-btn").addEventListener("click", addNewTag);
  
  // Recurring transaction toggle handlers
  document.getElementById("auto-create-recurring").addEventListener("change", function() {
    data.settings.recurring.autoCreate = this.checked;
    saveData();
  });
  
  document.getElementById("notify-recurring").addEventListener("change", function() {
    data.settings.recurring.notifications = this.checked;
    saveData();
  });
  
  // Manage recurring transactions button
  document.getElementById("manage-recurring-btn").addEventListener("click", function() {
    showRecurringTransactionsModal();
  });
    
  // Initialize bill calendar
  document.getElementById("manage-categories-btn").addEventListener("click", function() {
    showCategoriesModal();
  });
}

// Update theme buttons based on current theme
function updateThemeButtons() {
  const themeButtons = document.querySelectorAll('.theme-option');
  themeButtons.forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-theme') === data.settings.theme) {
      button.classList.add('active');
    }
    
    // Add click handler
    button.addEventListener('click', function() {
      const theme = this.getAttribute('data-theme');
      applyTheme(theme);
      updateThemeButtons();
      saveData();
    });
  });
}

// Initialize accent color selector
function initColorSelector() {
  const colorButtons = document.querySelectorAll('.color-selector .color-option');
  colorButtons.forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-color') === data.settings.accentColor) {
      button.classList.add('active');
    }
    
    // Add click handler
    button.addEventListener('click', function() {
      const color = this.getAttribute('data-color');
      data.settings.accentColor = color;
      
      // Update active state
      document.querySelectorAll('.color-selector .color-option').forEach(btn => {
        btn.classList.remove('active');
      });
      this.classList.add('active');
      
      // Apply the color
      document.documentElement.style.setProperty('--primary-color', color);
      document.documentElement.style.setProperty('--primary-dark', adjustColor(color, -20));
      document.documentElement.style.setProperty('--primary-light', adjustColor(color, 40, true));
      
      saveData();
      showUpdateNotification("Accent color updated");
    });
  });
}

// Initialize widget checkboxes
function initWidgetCheckboxes() {
  // Widget settings are guaranteed to exist thanks to loadData initialization
  
  // Setup widget checkboxes
  document.getElementById('widget-total-balance').checked = data.settings.dashboard.widgets.totalBalance;
  document.getElementById('widget-accounts').checked = data.settings.dashboard.widgets.accounts;
  document.getElementById('widget-recent-transactions').checked = data.settings.dashboard.widgets.recentTransactions;
  document.getElementById('widget-upcoming-bills').checked = data.settings.dashboard.widgets.upcomingBills;
  document.getElementById('widget-spending-chart').checked = data.settings.dashboard.widgets.spendingChart;
  
  // Add event listeners
  document.getElementById('widget-total-balance').addEventListener('change', function() {
    data.settings.dashboard.widgets.totalBalance = this.checked;
    saveData();
    applyDashboardWidgets();
  });
  
  document.getElementById('widget-accounts').addEventListener('change', function() {
    data.settings.dashboard.widgets.accounts = this.checked;
    saveData();
    applyDashboardWidgets();
  });
  
  document.getElementById('widget-recent-transactions').addEventListener('change', function() {
    data.settings.dashboard.widgets.recentTransactions = this.checked;
    saveData();
    applyDashboardWidgets();
  });
  
  document.getElementById('widget-upcoming-bills').addEventListener('change', function() {
    data.settings.dashboard.widgets.upcomingBills = this.checked;
    saveData();
    applyDashboardWidgets();
  });
  
  document.getElementById('widget-spending-chart').addEventListener('change', function() {
    data.settings.dashboard.widgets.spendingChart = this.checked;
    saveData();
    applyDashboardWidgets();
  });
}

// Initialize default view selector
function initDefaultViewSelector() {
  // Dashboard settings are guaranteed to exist thanks to loadData initialization
  
  const defaultViewSelect = document.getElementById('default-view');
  defaultViewSelect.value = data.settings.dashboard.defaultView;
  
  defaultViewSelect.addEventListener('change', function() {
    data.settings.dashboard.defaultView = this.value;
    saveData();
  });
}

// Calculate and display storage usage
function calculateStorageUsage() {
  const storageUsage = document.getElementById('storage-usage');
  if (!storageUsage) return;
  
  try {
    const dataSize = new Blob([JSON.stringify(data)]).size;
    const formattedSize = formatFileSize(dataSize);
    storageUsage.textContent = formattedSize;
  } catch (error) {
    storageUsage.textContent = 'Unable to calculate';
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

// Render the tags list in settings
function renderTagsList() {
  const tagsListEl = document.getElementById("tags-list");
  if (!tagsListEl) return;
  
  tagsListEl.innerHTML = '';
  
  if (!data.tags || data.tags.length === 0) {
    tagsListEl.innerHTML = '<span class="text-muted">No tags created yet.</span>';
    return;
  }
  
  data.tags.forEach(tag => {
    const tagElement = document.createElement("div");
    tagElement.className = "tag-item";
    tagElement.innerHTML = `
      ${tag}
      <span class="remove-tag" data-tag="${tag}"><i class="fas fa-times"></i></span>
    `;
    
    tagsListEl.appendChild(tagElement);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll(".remove-tag").forEach(btn => {
    btn.addEventListener("click", function() {
      const tag = this.getAttribute("data-tag");
      removeTag(tag);
    });
  });
}

// Add a new tag
function addNewTag() {
  const tagInput = document.getElementById("new-tag-input");
  const tag = tagInput.value.trim();
  
  if (!tag) {
    tagInput.classList.add("input-error");
    setTimeout(() => {
      tagInput.classList.remove("input-error");
    }, 2000);
    return;
  }
  
  // Ensure tags array exists
  if (!data.tags || !Array.isArray(data.tags)) {
    data.tags = [];
  }
  
  // Check if tag already exists
  if (data.tags.includes(tag)) {
    showUpdateNotification("This tag already exists");
    tagInput.value = "";
    return;
  }
  
  // Add the tag
  data.tags.push(tag);
  saveData();
  renderTagsList();
  
  // Clear input
  tagInput.value = "";
  showUpdateNotification("Tag added successfully");
}

// Remove a tag
function removeTag(tag) {
  // Remove tag from list
  data.tags = data.tags.filter(t => t !== tag);
  
  // Remove tag from all transactions
  data.transactions.forEach(tx => {
    if (tx.tags && tx.tags.includes(tag)) {
      tx.tags = tx.tags.filter(t => t !== tag);
    }
  });
  
  saveData();
  renderTagsList();
  renderTransactions(); // Refresh transactions to remove the deleted tag
  showUpdateNotification("Tag removed successfully");
}

// Initialize Google Drive backup
function initGoogleDriveBackup() {
  const authBtn = document.getElementById("google-auth-btn");
  const connectedDiv = document.getElementById("google-drive-connected");
  const authDiv = document.getElementById("google-drive-auth");
  const lastBackupInfo = document.getElementById("last-backup-info");
  
  // Backup settings are guaranteed to exist thanks to loadData initialization
  
  // Check if Google Drive is connected
  if (data.settings.backup.googleDrive.connected) {
    authDiv.classList.add("hidden");
    connectedDiv.classList.remove("hidden");
    
    // Show last backup time if available
    if (data.settings.backup.googleDrive.lastBackup) {
      const backupDate = new Date(data.settings.backup.googleDrive.lastBackup);
      lastBackupInfo.textContent = `Last backup: ${backupDate.toLocaleString()}`;
    } else {
      lastBackupInfo.textContent = "Last backup: Never";
    }
  } else {
    authDiv.classList.remove("hidden");
    connectedDiv.classList.add("hidden");
  }
  
  // Add event listeners
  authBtn.addEventListener("click", connectGoogleDrive);
  document.getElementById("backup-now-btn").addEventListener("click", backupToGoogleDrive);
  document.getElementById("restore-backup-btn").addEventListener("click", restoreFromGoogleDrive);
  document.getElementById("disconnect-drive-btn").addEventListener("click", disconnectGoogleDrive);
}

// Connect to Google Drive
function connectGoogleDrive() {
  // In a real implementation, we would handle OAuth2 flow here
  // For this demo, we'll simulate the connection
  
  showUpdateNotification("Connecting to Google Drive...");
  
  // Simulate API delay
  setTimeout(() => {
    data.settings.backup.googleDrive.connected = true;
    saveData();
    
    // Update UI
    document.getElementById("google-drive-auth").classList.add("hidden");
    document.getElementById("google-drive-connected").classList.remove("hidden");
    
    showUpdateNotification("Connected to Google Drive successfully");
  }, 1500);
}

// Backup data to Google Drive
function backupToGoogleDrive() {
  
  showUpdateNotification("Backing up data to Google Drive...");
  
  // Simulate backup process
  setTimeout(() => {
    // Update last backup time
    data.settings.backup.googleDrive.lastBackup = new Date().toISOString();
    saveData();
    
    // Update last backup info display
    const backupDate = new Date(data.settings.backup.googleDrive.lastBackup);
    document.getElementById("last-backup-info").textContent = 
      `Last backup: ${backupDate.toLocaleString()}`;
    
    showUpdateNotification("Backup completed successfully");
  }, 2000);
}

// Restore data from Google Drive
function restoreFromGoogleDrive() {
  if (!confirm("Are you sure you want to restore data from Google Drive? This will replace all current data.")) {
    return;
  }
  
  showUpdateNotification("Restoring data from Google Drive...");
  
  // Simulate restore process
  setTimeout(() => {
    // In a real implementation, we would fetch the backup data from Google Drive here
    // For this demo, we'll just show a notification
    
    showUpdateNotification("Data restored successfully");
    // After restoring, we would reload the page to apply the restored data
  }, 2000);
}

// Disconnect Google Drive
function disconnectGoogleDrive() {
  if (!confirm("Are you sure you want to disconnect Google Drive? This will not delete your backups, but automatic backups will stop.")) {
    return;
  }
  
  // Update settings
  data.settings.backup.googleDrive.connected = false;
  saveData();
  
  // Update UI
  document.getElementById("google-drive-auth").classList.remove("hidden");
  document.getElementById("google-drive-connected").classList.add("hidden");
  
  showUpdateNotification("Disconnected from Google Drive");
}

// Initialize local backup buttons
function initLocalBackupButtons() {
  document.getElementById("export-data-btn").addEventListener("click", exportData);
  document.getElementById("import-data-btn").addEventListener("click", importData);
}

// Export data to JSON file
function exportData() {
  // Create a JSON string from data
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  
  // Create download link
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `money-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
  
  // Append to document, click, and remove
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  showUpdateNotification("Data exported successfully");
}

// Import data from JSON file
function importData() {
  // Create an input element
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  
  // Handle file selection
  fileInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Validate imported data (basic check)
        if (!importedData || !importedData.balances || !importedData.transactions) {
          throw new Error("Invalid data format");
        }
        
        // Confirm import
        if (confirm("Are you sure you want to import this data? This will replace all current data.")) {
          data = importedData;
          saveData();
          showUpdateNotification("Data imported successfully. Reloading...");
          
          // Reload page to apply imported data
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        showUpdateNotification("Error importing data: " + error.message);
      }
    };
    
    reader.readAsText(file);
  });
  
  // Trigger file selection
  fileInput.click();
}

// Process recurring transactions
function processRecurringTransactions() {
  // Only process if auto-create is enabled
  if (!data.settings.recurring.autoCreate) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  const todayStr = today.toISOString().split('T')[0];
  
  // Check each recurring transaction
  data.settings.recurringTransactions.forEach(recurringTx => {
    if (!recurringTx.active) return;
    
    const lastCreated = recurringTx.lastCreated ? new Date(recurringTx.lastCreated) : null;
    let shouldCreate = false;
    
    // Check if transaction should be created based on frequency
    switch (recurringTx.frequency) {
      case 'daily':
        shouldCreate = !lastCreated || getDaysDifference(lastCreated, today) >= 1;
        break;
      case 'weekly':
        shouldCreate = !lastCreated || getDaysDifference(lastCreated, today) >= 7;
        break;
      case 'biweekly':
        shouldCreate = !lastCreated || getDaysDifference(lastCreated, today) >= 14;
        break;
      case 'monthly':
        shouldCreate = !lastCreated || getMonthsDifference(lastCreated, today) >= 1;
        break;
      case 'quarterly':
        shouldCreate = !lastCreated || getMonthsDifference(lastCreated, today) >= 3;
        break;
      case 'yearly':
        shouldCreate = !lastCreated || getMonthsDifference(lastCreated, today) >= 12;
        break;
    }
    
    if (shouldCreate) {
      // Create the transaction
      const newTx = {
        amount: recurringTx.amount,
        account: recurringTx.account,
        type: recurringTx.type,
        description: recurringTx.description,
        date: todayStr,
        category: recurringTx.category,
        isRecurring: true,
        isPinned: false,
        notes: `Auto-created recurring transaction: ${recurringTx.description}`,
        tags: recurringTx.tags || [],
        id: "tx-" + Math.random().toString(36).substr(2, 9)
      };
      
      // Add transaction to data
      data.transactions.push(newTx);
      
      // Update account balance
      data.balances[newTx.account] += newTx.type === "expense" ? -newTx.amount : newTx.amount;
      
      // Update last created date
      recurringTx.lastCreated = todayStr;
      
      // Notify user if enabled
      if (data.settings.recurring.notifications) {
        showUpdateNotification(`Created recurring ${recurringTx.type}: ${recurringTx.description}`);
      }
    }
  });
  
  // Save changes
  saveData();
  renderTransactions();
  renderBalances();
}

// Get days difference between two dates
function getDaysDifference(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Get months difference between two dates
function getMonthsDifference(date1, date2) {
  const months = (date2.getFullYear() - date1.getFullYear()) * 12;
  return months + date2.getMonth() - date1.getMonth();
}

// Show recurring transactions management modal
function showRecurringTransactionsModal() {
  // Create modal HTML if it doesn't exist
  if (!document.getElementById("recurring-tx-modal")) {
    const modalHTML = `
      <div id="recurring-tx-modal" class="modal hidden">
        <div class="modal-content">
          <button id="recurring-close-btn" class="close-btn" aria-label="Close">&times;</button>
          <h3><i class="fas fa-sync"></i> Manage Recurring Transactions</h3>
          <div id="recurring-tx-list">
            <!-- Recurring transactions will be listed here -->
          </div>
          <div class="modal-actions">
            <button id="add-recurring-btn" class="primary-btn"><i class="fas fa-plus"></i> Add Recurring Transaction</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById("recurring-close-btn").addEventListener("click", function() {
      document.getElementById("recurring-tx-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
    
    document.getElementById("add-recurring-btn").addEventListener("click", function() {
      // Show transaction modal with recurring checked
      document.getElementById("recurring-tx-modal").classList.add("hidden");
      document.getElementById("tx-modal").classList.remove("hidden");
      document.getElementById("tx-recurring").checked = true;
    });
  }
  
  // Render recurring transactions
  renderRecurringTransactions();
  
  // Show the modal
  document.getElementById("recurring-tx-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

// Render recurring transactions list
function renderRecurringTransactions() {
  const listElement = document.getElementById("recurring-tx-list");
  if (!listElement) return;
  
  listElement.innerHTML = '';
  
  // Get recurring transactions
  const recurringTxs = data.settings.recurringTransactions || [];
  
  if (recurringTxs.length === 0) {
    listElement.innerHTML = '<p class="text-muted">No recurring transactions set up yet.</p>';
    return;
  }
  
  // Create list items
  recurringTxs.forEach(tx => {
    const txElement = document.createElement("div");
    txElement.className = "recurring-tx-item";
    txElement.innerHTML = `
      <div class="recurring-tx-details">
        <div class="recurring-tx-name">${tx.description}</div>
        <div class="recurring-tx-info">
          ${formatAmt(tx.amount)} • ${tx.frequency} • ${tx.account}
        </div>
        <div class="recurring-tx-next">
          Next: ${getNextOccurrence(tx)}
        </div>
      </div>
      <div class="recurring-tx-actions">
        <button class="toggle-recurring-btn ${tx.active ? 'active' : ''}" data-id="${tx.id}">
          <i class="fas fa-${tx.active ? 'toggle-on' : 'toggle-off'}"></i>
        </button>
        <button class="edit-recurring-btn" data-id="${tx.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-recurring-btn" data-id="${tx.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    listElement.appendChild(txElement);
  });
  
  // Add event listeners
  document.querySelectorAll(".toggle-recurring-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const txId = this.getAttribute("data-id");
      toggleRecurringTransaction(txId);
    });
  });
  
  document.querySelectorAll(".edit-recurring-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const txId = this.getAttribute("data-id");
      editRecurringTransaction(txId);
    });
  });
  
  document.querySelectorAll(".delete-recurring-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const txId = this.getAttribute("data-id");
      deleteRecurringTransaction(txId);
    });
  });
}

// Get next occurrence date for a recurring transaction
function getNextOccurrence(tx) {
  if (!tx.lastCreated) {
    return "Today";
  }
  
  const lastDate = new Date(tx.lastCreated);
  const nextDate = new Date(lastDate);
  
  switch (tx.frequency) {
    case 'daily':
      nextDate.setDate(lastDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(lastDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(lastDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(lastDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(lastDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(lastDate.getFullYear() + 1);
      break;
  }
  
  return nextDate.toLocaleDateString();
}

// Toggle a recurring transaction active status
function toggleRecurringTransaction(txId) {
  // Find the transaction
  const tx = data.settings.recurringTransactions.find(t => t.id === txId);
  if (!tx) return;
  
  // Toggle active status
  tx.active = !tx.active;
  
  // Save and refresh
  saveData();
  renderRecurringTransactions();
  
  showUpdateNotification(`Recurring transaction ${tx.active ? 'activated' : 'deactivated'}`);
}

// Edit a recurring transaction
function editRecurringTransaction(txId) {
  // To be implemented - would open a modal with the recurring transaction details
  showUpdateNotification("Edit recurring transaction - Feature coming soon");
}

// Delete a recurring transaction
function deleteRecurringTransaction(txId) {
  if (!confirm("Are you sure you want to delete this recurring transaction?")) {
    return;
  }
  
  // Remove transaction
  data.settings.recurringTransactions = data.settings.recurringTransactions.filter(t => t.id !== txId);
  
  // Save and refresh
  saveData();
  renderRecurringTransactions();
  
  showUpdateNotification("Recurring transaction deleted");
}

// Initialize recurring transaction settings
function initRecurringSettings() {
  // Set toggle values
  document.getElementById("auto-create-recurring").checked = data.settings.recurring.autoCreate;
  document.getElementById("notify-recurring").checked = data.settings.recurring.notifications;
}

// Render bill calendar
function renderBillCalendar() {
  // Ensure bills array exists
  if (!data.bills || !Array.isArray(data.bills)) {
    data.bills = [];
  }
  
  // Create bill calendar widget if it doesn't exist
  if (!document.getElementById("bill-calendar-widget")) {
    // Create the bill calendar container
    const billCalendarHTML = `
      <section class="bill-calendar-container card">
        <h2>Upcoming Bills</h2>
        <div id="bill-calendar">
          <div class="bill-calendar-header">
            <button id="prev-month" class="calendar-nav-btn"><i class="fas fa-chevron-left"></i></button>
            <h3 id="calendar-month">March 2023</h3>
            <button id="next-month" class="calendar-nav-btn"><i class="fas fa-chevron-right"></i></button>
          </div>
          <div id="calendar-grid">
            <!-- Calendar will be rendered here -->
          </div>
        </div>
        <div class="bill-calendar-footer">
          <button id="add-bill-btn" class="primary-btn"><i class="fas fa-plus"></i> Add Bill</button>
        </div>
      </section>
    `;
    
    // Insert after total balance card
    const totalBalanceCard = document.querySelector(".total-balance.card");
    if (totalBalanceCard) {
      totalBalanceCard.insertAdjacentHTML('afterend', billCalendarHTML);
      
      // Add event listeners
      document.getElementById("prev-month").addEventListener("click", () => navigateCalendar(-1));
      document.getElementById("next-month").addEventListener("click", () => navigateCalendar(1));
      document.getElementById("add-bill-btn").addEventListener("click", showAddBillModal);
      
      // Render the calendar
      renderCalendar(new Date());
    }
  } else {
    // Just refresh the calendar if it already exists
    renderCalendar(new Date());
  }
}

// Render calendar for a specific month
function renderCalendar(date) {
  const calendarGrid = document.getElementById("calendar-grid");
  if (!calendarGrid) return;
  
  // Update month heading
  document.getElementById("calendar-month").textContent = 
    date.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  // Clear grid
  calendarGrid.innerHTML = '';
  
  // Create weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day-header";
    dayEl.textContent = day;
    calendarGrid.appendChild(dayEl);
  });
  
  // Get first day of month and last day
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  // Add empty cells for days before first day of month
  for (let i = 0; i < firstDay.getDay(); i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day empty";
    calendarGrid.appendChild(emptyDay);
  }
  
  // Get today's date for highlighting
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Add days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dayEl = document.createElement("div");
    const currentDate = new Date(date.getFullYear(), date.getMonth(), i);
    
    // Add class based on whether it's today
    dayEl.className = "calendar-day";
    if (currentDate.getTime() === today.getTime()) {
      dayEl.classList.add("today");
    }
    
    // Date number
    const dateNumber = document.createElement("div");
    dateNumber.className = "date-number";
    dateNumber.textContent = i;
    dayEl.appendChild(dateNumber);
    
    // Add bills for this day
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayBills = data.bills.filter(bill => {
      const billDate = new Date(bill.date);
      return billDate.getDate() === i && 
             billDate.getMonth() === date.getMonth() && 
             billDate.getFullYear() === date.getFullYear();
    });
    
    if (dayBills.length > 0) {
      const billsList = document.createElement("div");
      billsList.className = "day-bills";
      
      dayBills.forEach(bill => {
        const billItem = document.createElement("div");
        billItem.className = "bill-item";
        billItem.innerHTML = `
          <span class="bill-amount">${formatAmt(bill.amount)}</span>
          <span class="bill-name">${bill.description}</span>
        `;
        billItem.addEventListener("click", () => showBillDetails(bill.id));
        billsList.appendChild(billItem);
      });
      
      dayEl.appendChild(billsList);
      dayEl.classList.add("has-bills");
    }
    
    calendarGrid.appendChild(dayEl);
  }
}

// Navigate calendar months
function navigateCalendar(monthOffset) {
  const currentMonth = document.getElementById("calendar-month").textContent;
  const [monthName, year] = currentMonth.split(" ");
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthIndex = monthNames.indexOf(monthName);
  
  const newDate = new Date(parseInt(year), currentMonthIndex + monthOffset, 1);
  renderCalendar(newDate);
}

// Show modal to add a new bill
function showAddBillModal() {
  // Create the modal if it doesn't exist
  if (!document.getElementById("bill-modal")) {
    const modalHTML = `
      <div id="bill-modal" class="modal hidden">
        <div class="modal-content">
          <button id="bill-close-btn" class="close-btn" aria-label="Close">&times;</button>
          <h3 id="bill-modal-title"><i class="fas fa-file-invoice-dollar"></i> Add Bill</h3>
          <form id="bill-form">
            <label>
              Description
              <input type="text" id="bill-desc" required placeholder="e.g. Rent Payment" />
            </label>
            <label>
              Amount
              <input type="number" step="0.01" id="bill-amount" required />
            </label>
            <label>
              Due Date
              <input type="date" id="bill-date" required />
            </label>
            <label>
              Account
              <select id="bill-account">
                <!-- Accounts will be populated dynamically -->
              </select>
            </label>
            <label>
              Category
              <select id="bill-category">
                <!-- Categories will be populated dynamically -->
              </select>
            </label>
            <label>
              Recurring
              <select id="bill-recurring">
                <option value="none">None</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label>
              Notes
              <textarea id="bill-notes" rows="3"></textarea>
            </label>
            <div class="form-actions">
              <button type="button" id="bill-cancel-btn">Cancel</button>
              <button type="submit">Save Bill</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById("bill-close-btn").addEventListener("click", function() {
      document.getElementById("bill-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
    
    document.getElementById("bill-cancel-btn").addEventListener("click", function() {
      document.getElementById("bill-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
    
    document.getElementById("bill-form").addEventListener("submit", function(e) {
      e.preventDefault();
      saveBill();
    });
  }
  
  // Reset form
  document.getElementById("bill-form").reset();
  document.getElementById("bill-date").value = getTodayString();
  document.getElementById("bill-modal-title").innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Add Bill';
  
  // Populate account options
  const accountSelect = document.getElementById("bill-account");
  accountSelect.innerHTML = '';
  data.accounts.forEach(account => {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = account.name;
    accountSelect.appendChild(option);
  });
  
  // Populate category options
  const categorySelect = document.getElementById("bill-category");
  categorySelect.innerHTML = '';
  data.categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  
  // Show the modal
  document.getElementById("bill-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

// Save a bill
function saveBill() {
  const description = document.getElementById("bill-desc").value;
  const amount = parseFloat(document.getElementById("bill-amount").value);
  const date = document.getElementById("bill-date").value;
  const account = document.getElementById("bill-account").value;
  const category = document.getElementById("bill-category").value;
  const recurring = document.getElementById("bill-recurring").value;
  const notes = document.getElementById("bill-notes").value;
  
  // Create bill object
  const bill = {
    id: "bill-" + Math.random().toString(36).substr(2, 9),
    description,
    amount,
    date,
    account,
    category,
    recurring,
    notes,
    paid: false
  };
  
  // Add to bills array
  data.bills.push(bill);
  
  // Save data
  saveData();
  
  // Close modal
  document.getElementById("bill-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  
  // Refresh calendar
  renderCalendar(new Date(date));
  
  showUpdateNotification("Bill added successfully");
}

// Show bill details
function showBillDetails(billId) {
  // Find the bill
  const bill = data.bills.find(b => b.id === billId);
  if (!bill) return;
  
  // Create modal if it doesn't exist
  if (!document.getElementById("bill-details-modal")) {
    const modalHTML = `
      <div id="bill-details-modal" class="modal hidden">
        <div class="modal-content">
          <button id="bill-details-close-btn" class="close-btn" aria-label="Close">&times;</button>
          <h3><i class="fas fa-file-invoice-dollar"></i> <span id="bill-details-title">Bill Details</span></h3>
          <div id="bill-details-content">
            <!-- Bill details will be rendered here -->
          </div>
          <div class="modal-actions">
            <button id="pay-bill-btn" class="primary-btn"><i class="fas fa-check"></i> Mark as Paid</button>
            <button id="edit-bill-btn" class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
            <button id="delete-bill-btn" class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById("bill-details-close-btn").addEventListener("click", function() {
      document.getElementById("bill-details-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
    
    document.getElementById("pay-bill-btn").addEventListener("click", function() {
      payBill(this.getAttribute("data-id"));
    });
    
    document.getElementById("edit-bill-btn").addEventListener("click", function() {
      editBill(this.getAttribute("data-id"));
    });
    
    document.getElementById("delete-bill-btn").addEventListener("click", function() {
      deleteBill(this.getAttribute("data-id"));
    });
  }
  
  // Ensure accounts array exists
  if (!data.accounts || !Array.isArray(data.accounts)) {
    data.accounts = [
      { id: "cu", name: "Credit Union", icon: "university", color: "#4a90e2" },
      { id: "revolut", name: "Revolut", icon: "credit-card", color: "#50c878" },
      { id: "cash", name: "Cash", icon: "money-bill-wave", color: "#ff9800" }
    ];
  }
  
  // Find account and category names
  const account = data.accounts.find(a => a.id === bill.account);
  const accountName = account ? account.name : "Unknown Account";
  
  // Update modal content
  document.getElementById("bill-details-title").textContent = bill.description || "Untitled Bill";
  document.getElementById("bill-details-content").innerHTML = `
    <p><strong>Amount:</strong> ${formatAmt(bill.amount)}</p>
    <p><strong>Due Date:</strong> ${new Date(bill.date).toLocaleDateString()}</p>
    <p><strong>Account:</strong> ${accountName}</p>
    <p><strong>Category:</strong> ${bill.category}</p>
    <p><strong>Recurring:</strong> ${bill.recurring === 'none' ? 'No' : bill.recurring}</p>
    ${bill.notes ? `<p><strong>Notes:</strong> ${bill.notes}</p>` : ''}
    <p><strong>Status:</strong> <span class="bill-status ${bill.paid ? 'paid' : 'unpaid'}">${bill.paid ? 'Paid' : 'Unpaid'}</span></p>
  `;
  
  // Set data attributes for action buttons
  document.getElementById("pay-bill-btn").setAttribute("data-id", bill.id);
  document.getElementById("edit-bill-btn").setAttribute("data-id", bill.id);
  document.getElementById("delete-bill-btn").setAttribute("data-id", bill.id);
  
  // Update pay button text based on status
  document.getElementById("pay-bill-btn").innerHTML = bill.paid ? 
    '<i class="fas fa-undo"></i> Mark as Unpaid' : 
    '<i class="fas fa-check"></i> Mark as Paid';
  
  // Show the modal
  document.getElementById("bill-details-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

// Mark a bill as paid/unpaid
function payBill(billId) {
  // Find the bill
  const bill = data.bills.find(b => b.id === billId);
  if (!bill) return;
  
  // Toggle paid status
  bill.paid = !bill.paid;
  
  // If marking as paid, create a transaction
  if (bill.paid) {
    const transaction = {
      id: "tx-" + Math.random().toString(36).substr(2, 9),
      amount: bill.amount,
      account: bill.account,
      type: "expense",
      description: bill.description,
      date: getTodayString(),
      category: bill.category,
      isRecurring: bill.recurring !== 'none',
      isPinned: false,
      notes: `Paid bill: ${bill.description}`,
      tags: ["Bill Payment"]
    };
    
    // Add to transactions
    data.transactions.push(transaction);
    
    // Update account balance
    data.balances[bill.account] -= bill.amount;
  }
  
  // Save data
  saveData();
  
  // Update the modal
  showBillDetails(billId);
  
  // Refresh calendar and balances
  renderCalendar(new Date(bill.date));
  renderBalances();
  renderTransactions();
  
  showUpdateNotification(`Bill marked as ${bill.paid ? 'paid' : 'unpaid'}`);
}

// Edit a bill
function editBill(billId) {
  // Find the bill
  const bill = data.bills.find(b => b.id === billId);
  if (!bill) return;
  
  // Close details modal
  document.getElementById("bill-details-modal").classList.add("hidden");
  
  // Open bill form modal
  showAddBillModal();
  
  // Set form values
  document.getElementById("bill-modal-title").innerHTML = '<i class="fas fa-edit"></i> Edit Bill';
  document.getElementById("bill-desc").value = bill.description;
  document.getElementById("bill-amount").value = bill.amount;
  document.getElementById("bill-date").value = bill.date;
  document.getElementById("bill-account").value = bill.account;
  document.getElementById("bill-category").value = bill.category;
  document.getElementById("bill-recurring").value = bill.recurring;
  document.getElementById("bill-notes").value = bill.notes || '';
  
  // Update form submission to edit instead of create
  const form = document.getElementById("bill-form");
  form.onsubmit = function(e) {
    e.preventDefault();
    
    // Update bill properties
    bill.description = document.getElementById("bill-desc").value;
    bill.amount = parseFloat(document.getElementById("bill-amount").value);
    bill.date = document.getElementById("bill-date").value;
    bill.account = document.getElementById("bill-account").value;
    bill.category = document.getElementById("bill-category").value;
    bill.recurring = document.getElementById("bill-recurring").value;
    bill.notes = document.getElementById("bill-notes").value;
    
    // Save data
    saveData();
    
    // Close modal
    document.getElementById("bill-modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
    
    // Refresh calendar
    renderCalendar(new Date(bill.date));
    
    showUpdateNotification("Bill updated successfully");
  };
}

// Delete a bill
function deleteBill(billId) {
  if (!confirm("Are you sure you want to delete this bill?")) return;
  
  // Remove the bill
  data.bills = data.bills.filter(b => b.id !== billId);
  
  // Save data
  saveData();
  
  // Close modal
  document.getElementById("bill-details-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  
  // Refresh calendar
  renderCalendar(new Date());
  
  showUpdateNotification("Bill deleted successfully");
}

// Show categories management modal
function showCategoriesModal() {
  // Create modal if it doesn't exist
  if (!document.getElementById("categories-modal")) {
    const modalHTML = `
      <div id="categories-modal" class="modal hidden">
        <div class="modal-content">
          <button id="categories-close-btn" class="close-btn" aria-label="Close">&times;</button>
          <h3><i class="fas fa-tags"></i> Manage Categories</h3>
          <div id="categories-list">
            <!-- Categories will be rendered here -->
          </div>
          <div class="add-category-form">
            <input type="text" id="new-category-input" placeholder="New category name">
            <button id="add-category-btn" class="primary-btn">Add</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById("categories-close-btn").addEventListener("click", function() {
      document.getElementById("categories-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
    
    document.getElementById("add-category-btn").addEventListener("click", addNewCategory);
  }
  
  // Render categories
  renderCategoriesList();
  
  // Show the modal
  document.getElementById("categories-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

// Render categories list
function renderCategoriesList() {
  const categoriesListEl = document.getElementById("categories-list");
  if (!categoriesListEl) return;
  
  categoriesListEl.innerHTML = '';
  
  // Ensure categories array exists
  if (!data.categories || !Array.isArray(data.categories)) {
    data.categories = [
      "Food & Dining",
      "Shopping",
      "Transportation",
      "Bills & Utilities",
      "Entertainment",
      "Health & Fitness",
      "Travel",
      "Education",
      "Personal Care",
      "Gifts",
      "Other"
    ];
  }
  
  data.categories.forEach(category => {
    const categoryElement = document.createElement("div");
    categoryElement.className = "category-item";
    categoryElement.innerHTML = `
      <span class="category-name">${category}</span>
      <button class="delete-category-btn" data-category="${category}"><i class="fas fa-trash"></i></button>
    `;
    
    categoriesListEl.appendChild(categoryElement);
  });
  
  // Add event listeners to delete buttons
  document.querySelectorAll(".delete-category-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const category = this.getAttribute("data-category");
      deleteCategory(category);
    });
  });
}

// Add a new category
function addNewCategory() {
  const categoryInput = document.getElementById("new-category-input");
  const category = categoryInput.value.trim();
  
  if (!category) {
    categoryInput.classList.add("input-error");
    setTimeout(() => {
      categoryInput.classList.remove("input-error");
    }, 2000);
    return;
  }
  
  // Check if category already exists
  if (data.categories.includes(category)) {
    showUpdateNotification("This category already exists");
    categoryInput.value = "";
    return;
  }
  
  // Add the category
  data.categories.push(category);
  saveData();
  renderCategoriesList();
  
  // Clear input
  categoryInput.value = "";
  showUpdateNotification("Category added successfully");
}

// Delete a category
function deleteCategory(category) {
  // Don't allow deleting if it's the only category
  if (data.categories.length <= 1) {
    showUpdateNotification("You must have at least one category");
    return;
  }
  
  if (!confirm(`Are you sure you want to delete the "${category}" category? Transactions with this category will be set to "Other".`)) {
    return;
  }
  
  // Update transactions using this category
  data.transactions.forEach(tx => {
    if (tx.category === category) {
      tx.category = "Other";
    }
  });
  
  // Update bills using this category
  data.bills.forEach(bill => {
    if (bill.category === category) {
      bill.category = "Other";
    }
  });
  
  // Remove category
  data.categories = data.categories.filter(c => c !== category);
  
  saveData();
  renderCategoriesList();
  renderTransactions();
  
  showUpdateNotification("Category deleted successfully");
}

// Create and update charts
function updateCharts() {
  if (!window.Chart) return; // Skip if Chart.js isn't loaded

  // Destroy existing charts to prevent duplicates
  if (window.incomeVsExpenseChart) window.incomeVsExpenseChart.destroy();
  if (window.categoryChart) window.categoryChart.destroy();
  if (window.accountBalanceChart) window.accountBalanceChart.destroy();
  if (window.balanceOverTimeChart) window.balanceOverTimeChart.destroy();

  // Get canvas contexts
  const incomeVsExpenseCtx = document
    .getElementById("income-expense-chart")
    .getContext("2d");
  const categoryCtx = document
    .getElementById("category-chart")
    .getContext("2d");
  const accountBalanceCtx = document
    .getElementById("account-balance-chart")
    .getContext("2d");
  const balanceOverTimeCtx = document
    .getElementById("balance-over-time-chart")
    ?.getContext("2d");
  if (!balanceOverTimeCtx) return; // Skip if canvas not found

  // Get current date
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter transactions for the current month
  const thisMonthTransactions = data.transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return (
      txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
    );
  });

  // Income vs Expense data
  const income = thisMonthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expense = thisMonthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Create income vs expense chart
  window.incomeVsExpenseChart = new Chart(incomeVsExpenseCtx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [
        {
          label: "Amount (€)",
          data: [income, expense],
          backgroundColor: ["rgba(76, 175, 80, 0.6)", "rgba(244, 67, 54, 0.6)"],
          borderColor: ["rgb(76, 175, 80)", "rgb(244, 67, 54)"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Income vs Expense This Month",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  // Category data
  const categories = {};
  thisMonthTransactions.forEach((tx) => {
    if (tx.type === "expense") {
      const category = tx.category || "Other";
      categories[category] = (categories[category] || 0) + tx.amount;
    }
  });

  // Create category chart
  window.categoryChart = new Chart(categoryCtx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [
        {
          data: Object.values(categories),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(199, 199, 199, 0.6)",
            "rgba(83, 102, 255, 0.6)",
            "rgba(40, 159, 64, 0.6)",
            "rgba(210, 199, 199, 0.6)",
            "rgba(78, 52, 199, 0.6)",
            "rgba(225, 109, 64, 0.6)",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Spending by Category",
        },
      },
    },
  });

  // Account balance chart
  window.accountBalanceChart = new Chart(accountBalanceCtx, {
    type: "pie",
    data: {
      labels: ["Credit Union", "Revolut", "Cash"],
      datasets: [
        {
          data: [
            data.balances.cu || 0,
            data.balances.revolut || 0,
            data.balances.cash || 0,
          ],
          backgroundColor: [
            "rgba(106, 117, 202, 0.6)",
            "rgba(243, 119, 54, 0.6)",
            "rgba(76, 175, 80, 0.6)",
          ],
          borderColor: [
            "rgb(106, 117, 202)",
            "rgb(243, 119, 54)",
            "rgb(76, 175, 80)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Balance Distribution",
        },
      },
    },
  });
}

// Search transactions
function searchTransactions(query) {
  if (!query || query.trim() === "") {
    renderTransactions();
    return;
  }

  query = query.toLowerCase().trim();

  // Filter transactions that match the query
  let searchResults = data.transactions.filter((tx) => {
    const desc = (tx.description || "").toLowerCase();
    const category = (tx.category || "").toLowerCase();
    const date = tx.date;
    const amount = tx.amount.toString();
    const notes = (tx.notes || "").toLowerCase();

    return (
      desc.includes(query) ||
      category.includes(query) ||
      date.includes(query) ||
      amount.includes(query) ||
      notes.includes(query)
    );
  });

  // Update the transaction list with search results
  const ul = document.getElementById("tx-list");
  ul.innerHTML = "";

  if (searchResults.length === 0) {
    ul.innerHTML =
      "<li class='no-transactions'>No transactions match your search</li>";
    return;
  }

  // Apply current sort to search results
  switch (sortOrder) {
    case "date-desc":
      searchResults.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "date-asc":
      searchResults.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "amount-desc":
      searchResults.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      searchResults.sort((a, b) => a.amount - b.amount);
      break;
  }

  // Render search results
  searchResults.forEach((tx) => {
    const li = document.createElement("li");
    li.setAttribute("data-account", tx.account);
    li.setAttribute(
      "data-id",
      tx.id || "tx-" + Math.random().toString(36).substr(2, 9),
    );

    if (tx.isPinned) {
      li.classList.add("pinned");
    }

    const recurringIcon = tx.isRecurring
      ? `<i class="fas fa-sync-alt recurring-icon" title="Recurring Transaction"></i>`
      : "";

    li.innerHTML = `
      <span>
        <i class="fas fa-${tx.type === "expense" ? "arrow-down" : "arrow-up"}"
           style="color: var(--${tx.type}-color);"></i>
        <span class="account-dot" style="background-color: ${getAccountColor(tx.account)};"></span>
        ${tx.description || "(no desc)"}
        ${recurringIcon}
        ${tx.category ? `<span class="category-tag">${tx.category}</span>` : ""}
      </span>
      <span>${formatAmt(tx.amount)}</span>
    `;

    li.addEventListener("click", function () {
      const index = data.transactions.findIndex(
        (t) =>
          t.id === tx.id ||
          (t.date === tx.date &&
            t.amount === tx.amount &&
            t.description === tx.description &&
            t.type === tx.type &&
            t.account === tx.account),
      );

      if (index !== -1) {
        currentTxIndex = index;
        openTransactionDetails(tx);
      }
    });

    ul.appendChild(li);
  });
}

// Open transaction details modal
function openTransactionDetails(tx) {
  const modal = document.getElementById("transaction-modal");
  const info = document.getElementById("tx-info");
  const mapPreview = document.getElementById("map-preview");

  // Get account name
  const getAccountName = (accountId) => {
    const account = data.accounts.find(a => a.id === accountId);
    return account ? account.name : "Unknown Account";
  };

  let detailsHtml =
    "<p><strong>Description:</strong> " +
    (tx.description || "(no desc)") +
    "</p>" +
    "<p><strong>Account:</strong> " +
    getAccountName(tx.account) +
    "</p>" +
    "<p><strong>Amount:</strong> " +
    formatAmt(tx.amount) +
    "</p>" +
    "<p><strong>Type:</strong> " +
    (tx.type === "income" ? "Income" : "Expense") +
    "</p>" +
    "<p><strong>Date:</strong> " +
    tx.date +
    "</p>" +
    "<p><strong>Category:</strong> " +
    (tx.category || "Uncategorized") +
    "</p>";

  if (tx.isRecurring) {
    detailsHtml += "<p><strong>Recurring:</strong> Yes</p>";
  }

  if (tx.notes && tx.notes.trim() !== "") {
    detailsHtml += "<p><strong>Notes:</strong> " + tx.notes + "</p>";
  }

  if (tx.attachments && tx.attachments.length > 0) {
    detailsHtml +=
      "<div class='attachment-section'><strong>Attachments:</strong><div class='attachment-list'>";
    tx.attachments.forEach((attachment) => {
      detailsHtml += `<div class='attachment-item'><img src='${attachment.data}' alt='Receipt'></div>`;
    });
    detailsHtml += "</div></div>";
  }

  info.innerHTML = detailsHtml;

  // Update pin/unpin button text
  const pinBtn = document.getElementById("pin-tx-btn");
  if (tx.isPinned) {
    pinBtn.innerHTML = `<i class="fas fa-thumbtack"></i> Unpin`;
    pinBtn.classList.add("active");
  } else {
    pinBtn.innerHTML = `<i class="fas fa-thumbtack"></i> Pin`;
    pinBtn.classList.remove("active");
  }

  // Clear previous map
  mapPreview.innerHTML = "";
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  // Initialize map after modal is visible
  setTimeout(() => {
    if (tx.location) {
      try {
        currentMap = L.map("map-preview").setView(
          [tx.location.latitude, tx.location.longitude],
          13,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(currentMap);
        L.marker([tx.location.latitude, tx.location.longitude]).addTo(
          currentMap,
        );
        // Force map to recalculate size
        currentMap.invalidateSize();
      } catch (e) {
        console.error("Error initializing map:", e);
        mapPreview.innerHTML =
          "<div class='no-location'>Error loading map</div>";
      }
    } else {
      mapPreview.innerHTML =
        "<div class='no-location'>No location data available</div>";
    }
  }, 100);
}

// Toggle pin status of a transaction
function togglePinTransaction(index) {
  if (index < 0 || index >= data.transactions.length) return;

  const tx = data.transactions[index];
  const txId = tx.id || "tx-" + Math.random().toString(36).substr(2, 9);

  // Ensure transaction has an ID
  if (!tx.id) {
    tx.id = txId;
  }

  // Toggle pinned status
  tx.isPinned = !tx.isPinned;

  // Update pinned transactions list in settings
  if (tx.isPinned) {
    if (!data.settings.pinnedTransactions.includes(txId)) {
      data.settings.pinnedTransactions.push(txId);
    }
  } else {
    data.settings.pinnedTransactions = data.settings.pinnedTransactions.filter(
      (id) => id !== txId,
    );
  }

  // Save and update UI
  saveData();
  renderTransactions();

  // Update pin button in modal
  const pinBtn = document.getElementById("pin-tx-btn");
  if (tx.isPinned) {
    pinBtn.innerHTML = `<i class="fas fa-thumbtack"></i> Unpin`;
    pinBtn.classList.add("active");
  } else {
    pinBtn.innerHTML = `<i class="fas fa-thumbtack"></i> Pin`;
    pinBtn.classList.remove("active");
  }
}

// Handle date range filtering
function filterByDateRange(startDate, endDate) {
  // If no dates provided, clear filter
  if (!startDate && !endDate) {
    renderTransactions();
    return;
  }

  // Convert to Date objects if strings are provided
  if (startDate && typeof startDate === "string") {
    startDate = new Date(startDate);
  }

  if (endDate && typeof endDate === "string") {
    endDate = new Date(endDate);
    // Set time to end of day
    endDate.setHours(23, 59, 59, 999);
  }

  // Filter transactions by date range
  let filteredTx = data.transactions;

  if (startDate) {
    filteredTx = filteredTx.filter((tx) => new Date(tx.date) >= startDate);
  }

  if (endDate) {
    filteredTx = filteredTx.filter((tx) => new Date(tx.date) <= endDate);
  }

  // Render filtered transactions
  const ul = document.getElementById("tx-list");
  ul.innerHTML = "";

  if (filteredTx.length === 0) {
    ul.innerHTML =
      "<li class='no-transactions'>No transactions in the selected date range</li>";
    return;
  }

  // Apply current sort to filtered results
  switch (sortOrder) {
    case "date-desc":
      filteredTx.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "date-asc":
      filteredTx.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "amount-desc":
      filteredTx.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      filteredTx.sort((a, b) => a.amount - b.amount);
      break;
  }

  // Display filtered transactions
  filteredTx.forEach((tx) => {
    const li = document.createElement("li");
    li.setAttribute("data-account", tx.account);
    li.setAttribute(
      "data-id",
      tx.id || "tx-" + Math.random().toString(36).substr(2, 9),
    );

    if (tx.isPinned) {
      li.classList.add("pinned");
    }

    const recurringIcon = tx.isRecurring
      ? `<i class="fas fa-sync-alt recurring-icon" title="Recurring Transaction"></i>`
      : "";

    li.innerHTML = `
      <span>
        <i class="fas fa-${tx.type === "expense" ? "arrow-down" : "arrow-up"}"
           style="color: var(--${tx.type}-color);"></i>
        <span class="account-dot" style="background-color: ${getAccountColor(tx.account)};"></span>
        ${tx.description || "(no desc)"}
        ${recurringIcon}
        ${tx.category ? `<span class="category-tag">${tx.category}</span>` : ""}
      </span>
      <span>${formatAmt(tx.amount)}</span>
    `;

    li.addEventListener("click", function () {
      const index = data.transactions.findIndex(
        (t) =>
          t.id === tx.id ||
          (t.date === tx.date &&
            t.amount === tx.amount &&
            t.description === tx.description &&
            t.type === tx.type &&
            t.account === tx.account),
      );

      if (index !== -1) {
        currentTxIndex = index;
        openTransactionDetails(tx);
      }
    });

    ul.appendChild(li);
  });
}

// Switch between app views (transactions, charts, budgets)
function switchView(viewName) {
  // Hide all views
  document.getElementById("transactions-view").classList.add("hidden");
  document.getElementById("charts-view").classList.add("hidden");
  document.getElementById("budgets-view").classList.add("hidden");

  // Remove active class from all nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Show selected view and highlight nav item
  document.getElementById(`${viewName}-view`).classList.remove("hidden");
  document
    .querySelector(`.nav-item[data-view="${viewName}"]`)
    .classList.add("active");

  // Update current view
  currentView = viewName;

  // If switching to charts view, update charts
  if (viewName === "charts") {
    updateCharts();
    updateBalanceOverTimeChart();
  }

  // If switching to budgets view, render budgets
  if (viewName === "budgets") {
    renderBudgets();
  }
}

// Render budgets
function renderBudgets() {
  const budgetContainer = document.getElementById("budget-items");
  budgetContainer.innerHTML = "";

  // Get all categories
  const categories = data.categories || [];

  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  // Filter transactions for current month
  const thisMonthTransactions = data.transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= monthStart && txDate <= monthEnd && tx.type === "expense";
  });

  // Calculate spending by category
  const spendingByCategory = {};
  thisMonthTransactions.forEach((tx) => {
    const category = tx.category || "Other";
    spendingByCategory[category] =
      (spendingByCategory[category] || 0) + tx.amount;
  });

  // For each category, create a budget item
  categories.forEach((category) => {
    if (category === "Income") return; // Skip Income category for budgets

    const budgetItem = document.createElement("div");
    budgetItem.className = "budget-item";

    // Get budget amount from data or default to 0
    const budgetAmount = (data.budgets && data.budgets[category]) || 0;
    // Get actual spending
    const actualSpending = spendingByCategory[category] || 0;
    // Calculate progress percentage (capped at 100%)
    const progressPercent =
      budgetAmount > 0
        ? Math.min(Math.round((actualSpending / budgetAmount) * 100), 100)
        : 0;
    // Determine status color
    let statusColor = "var(--accent)";
    if (progressPercent > 90) statusColor = "var(--expense-color)";
    else if (progressPercent > 70) statusColor = "orange";

    budgetItem.innerHTML = `
      <div class="budget-header">
        <h3>${category}</h3>
        <button class="set-budget-btn" data-category="${category}">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      <div class="budget-details">
        <div class="budget-progress">
          <div class="progress-bar" style="width: ${progressPercent}%; background-color: ${statusColor};"></div>
        </div>
        <div class="budget-stats">
          <span>${formatAmt(actualSpending)} of ${formatAmt(budgetAmount)}</span>
          <span>${progressPercent}%</span>
        </div>
      </div>
    `;

    budgetContainer.appendChild(budgetItem);

    // Add event listener to edit budget button
    budgetItem
      .querySelector(".set-budget-btn")
      .addEventListener("click", function () {
        const category = this.dataset.category;
        const currentBudget = (data.budgets && data.budgets[category]) || 0;
        const newBudget = prompt(`Set budget for ${category}:`, currentBudget);

        if (newBudget !== null) {
          // Parse and validate budget amount
          const budgetAmount = parseFloat(newBudget);
          if (!isNaN(budgetAmount) && budgetAmount >= 0) {
            // Initialize budgets object if it doesn't exist
            if (!data.budgets) data.budgets = {};
            // Set budget
            data.budgets[category] = budgetAmount;
            // Save data
            saveData();
            // Re-render budgets
            renderBudgets();
          } else {
            alert("Please enter a valid budget amount.");
          }
        }
      });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  renderBalances();
  renderTransactions();
  renderTotalBalance();
  updateAccountOptions();
  updateFilters();
  initAccountManagement();
  
  // Apply app settings
  applyAppSettings();

  // Initialize views
  if (document.getElementById("charts-view")) {
    updateCharts();
  }
  
  // Initialize settings view
  if (document.getElementById("settings-view")) {
    initSettingsView();
  }
  
  // Ensure recurring settings exist
  if (!data.settings.recurring) {
    data.settings.recurring = {
      autoCreate: false,
      notifications: false
    };
  }
  
  // Ensure recurring transactions array exists
  if (!data.settings.recurringTransactions) {
    data.settings.recurringTransactions = [];
  }
  
  // Check for any recurring transactions that need to be created
  if (data.settings.recurring && data.settings.recurring.autoCreate) {
    processRecurringTransactions();
  }
  
  // Initialize and check for bill calendar widget
  if (data.settings.dashboard && data.settings.dashboard.widgets && data.settings.dashboard.widgets.upcomingBills) {
    renderBillCalendar();
  }

  if (document.getElementById("budgets-view")) {
    renderBudgets();
  }

  // Make total balance clickable to show all transactions
  document
    .querySelector(".total-balance")
    .addEventListener("click", function () {
      filters.account = "all";
      filters.type = "all";
      document.getElementById("account-filter").value = "all";
      document.getElementById("type-filter").value = "all";
      document.getElementById("date-range-filter").value = "all";
      document.getElementById("search-input").value = "";
      updateActiveAccountCard();
      renderTransactions();
    });

  // Set up navigation between views
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      switchView(this.dataset.view);
    });
  });

  // Initialize balance over time chart
  initBalanceOverTimeChart();

  // Initialize with transactions view
  switchView("transactions");

  // Search functionality
  document
    .getElementById("search-input")
    .addEventListener("input", function () {
      searchTransactions(this.value);
    });

  // Date range filter
  document
    .getElementById("date-range-filter")
    .addEventListener("change", function () {
      const value = this.value;
      const now = new Date();
      let startDate, endDate;

      switch (value) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
          );
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          endDate = new Date(now);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
          );
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
        case "custom":
          // Show custom date range inputs
          document
            .getElementById("custom-date-range")
            .classList.remove("hidden");
          return;
        default:
          // All transactions (no date filter)
          filterByDateRange(null, null);
          document.getElementById("custom-date-range").classList.add("hidden");
          return;
      }

      document.getElementById("custom-date-range").classList.add("hidden");
      filterByDateRange(startDate, endDate);
    });

  // Custom date range inputs
  document
    .getElementById("custom-start-date")
    .addEventListener("change", applyCustomDateRange);
  document
    .getElementById("custom-end-date")
    .addEventListener("change", applyCustomDateRange);

  function applyCustomDateRange() {
    const startDate = document.getElementById("custom-start-date").value;
    const endDate = document.getElementById("custom-end-date").value;

    if (startDate && endDate) {
      filterByDateRange(startDate, endDate);
    }
  }

  // Pin/Unpin transaction
  document.getElementById("pin-tx-btn").addEventListener("click", function () {
    togglePinTransaction(currentTxIndex);
  });

  // Theme toggle
  document
    .getElementById("theme-toggle")
    .addEventListener("click", function () {
      toggleTheme();
    });

  // Check for updates
  document.getElementById("refresh-btn").addEventListener("click", function () {
    checkForUpdates();
    this.classList.add("spinning");
    setTimeout(() => this.classList.remove("spinning"), 500);
  });

  // Prevent pinch zoom
  document.addEventListener(
    "touchmove",
    function (event) {
      if (event.scale !== 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  // Prevent double-tap zoom
  let lastTapTime = 0;
  document.addEventListener("touchend", function (event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    if (tapLength < 300 && tapLength > 0) {
      event.preventDefault();
    }
    lastTapTime = currentTime;
  });

  // Set viewport height variable for mobile browsers
  const setViewportHeight = () => {
    document.documentElement.style.setProperty(
      "--vh",
      `${window.innerHeight * 0.01}px`,
    );
  };
  window.addEventListener("resize", setViewportHeight);
  setViewportHeight();

  // Make sure transaction modal is hidden on page load
  document.getElementById("transaction-modal").classList.add("hidden");
  document.getElementById("edit-tx-modal").classList.add("hidden");
  document.getElementById("accounts-modal").classList.add("hidden");

  // Transaction modal close button
  document
    .getElementById("tx-close-btn")
    .addEventListener("click", function (e) {
      e.stopPropagation();
      document.getElementById("transaction-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
      if (currentMap) {
        currentMap.remove();
        currentMap = null;
      }
      // Restore scroll position when closing modal
      const scrollPos = parseInt(modal.dataset.scrollPosition || "0");
      setTimeout(() => window.scrollTo(0, scrollPos), 0);
    });

  document
    .getElementById("transaction-modal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        this.classList.add("hidden");
        document.body.classList.remove("modal-open");
        if (currentMap) {
          currentMap.remove();
          currentMap = null;
        }
        // Restore scroll position when closing modal
        const scrollPos = parseInt(this.dataset.scrollPosition || "0");
        setTimeout(() => window.scrollTo(0, scrollPos), 0);
      }
    });

  // Delete transaction button
  document
    .getElementById("delete-tx-btn")
    .addEventListener("click", function () {
      deleteTransaction(currentTxIndex);
    });

  // Edit transaction button
  document.getElementById("edit-tx-btn").addEventListener("click", function () {
    openEditTransactionModal(currentTxIndex);
  });

  // Cancel edit button
  document
    .getElementById("edit-cancel-btn")
    .addEventListener("click", function () {
      document.getElementById("edit-tx-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });

  // Edit transaction form submission
  document
    .getElementById("edit-tx-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      saveEditedTransaction();
    });

  // Reset all data buttons
  document.getElementById("reset-btn").addEventListener("click", confirmReset);
  document.getElementById("settings-reset-btn").addEventListener("click", confirmReset);
  
  // Account management event listeners
  document.getElementById("accounts-close-btn").addEventListener("click", cancelAccountModal);
  document.getElementById("cancel-account-btn").addEventListener("click", cancelAccountModal);
  document.getElementById("add-account-btn").addEventListener("click", saveAccount);
  document.getElementById("delete-account-btn").addEventListener("click", deleteAccount);
  
  // Initialize account management UI components
  initAccountManagement();

  // Reset confirmation modal buttons
  document
    .getElementById("reset-confirm-btn")
    .addEventListener("click", confirmReset);
  document
    .getElementById("reset-cancel-btn")
    .addEventListener("click", function () {
      document.getElementById("reset-confirm-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
  document
    .getElementById("reset-cancel-close-btn")
    .addEventListener("click", function () {
      document.getElementById("reset-confirm-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });

  // Close reset modal when clicking outside content
  document
    .getElementById("reset-confirm-modal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        this.classList.add("hidden");
        document.body.classList.remove("modal-open");
      }
    });

  // Filter and sort handlers
  document
    .getElementById("account-filter")
    .addEventListener("change", function (e) {
      filters.account = e.target.value;
      updateActiveAccountCard();
      renderTransactions();
    });

  document
    .getElementById("type-filter")
    .addEventListener("change", function (e) {
      filters.type = e.target.value;
      renderTransactions();
    });

  document.getElementById("sort-by").addEventListener("change", function (e) {
    sortOrder = e.target.value;
    renderTransactions();
  });

  // Account card filtering
  document.querySelectorAll(".card[data-account]").forEach((card) => {
    card.addEventListener("click", function () {
      const account = this.dataset.account;
      if (filters.account === account) {
        // If already filtered to this account, reset filter
        filters.account = "all";
        document.getElementById("account-filter").value = "all";
      } else {
        // Set filter to this account
        filters.account = account;
        document.getElementById("account-filter").value = account;
      }
      updateActiveAccountCard();
      renderTransactions();
    });
  });

  // Helper to update active card styling
  function updateActiveAccountCard() {
    document.querySelectorAll(".card[data-account]").forEach((card) => {
      if (filters.account === "all") {
        card.classList.remove("active");
      } else {
        card.classList.toggle(
          "active",
          card.dataset.account === filters.account,
        );
      }
    });
  }
});
