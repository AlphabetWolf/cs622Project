# Money Manager

A comprehensive, elegant financial tracking Progressive Web App (PWA) for managing personal finances across multiple platforms. This feature-rich application helps you track balances, manage transactions, analyze spending patterns, and plan budgets with a beautiful, responsive interface.

![Money Manager Screenshot](app_icon.png)

## ✨ Features

### 💳 **Account Management**
- **Custom Account Creation**: Add unlimited accounts with personalized names, icons, and colors
- **Multiple Account Types**: Support for banks, credit cards, cash, savings, and more
- **Visual Customization**: Choose from 12 icons and 9 color themes for each account
- **Real-time Balance Tracking**: Automatic balance calculations across all accounts

### 📊 **Transaction Management**
- **Comprehensive Transaction Recording**: Track income and expenses with detailed metadata
- **Smart Categorization**: 12 built-in categories with custom category support
- **Rich Transaction Details**: Add descriptions, notes, dates, and photo attachments
- **Location Tracking**: Automatic GPS location capture with interactive map visualization
- **Recurring Transactions**: Set up automatic recurring income and expenses
- **Transaction Pinning**: Pin important transactions to the top of your list
- **Advanced Search & Filtering**: Search by amount, description, category, account, or date range

### 📈 **Analytics & Insights**
- **Multiple Chart Types**: Income vs Expenses, Category breakdown, Account balances, and Balance over time
- **Flexible Time Ranges**: View data by week, month, quarter, or custom date ranges
- **Account-Specific Analysis**: Filter charts by specific accounts
- **Visual Spending Patterns**: Understand your financial habits at a glance

### 💰 **Budget Management**
- **Category Budgets**: Set monthly spending limits for different categories
- **Progress Tracking**: Visual progress bars showing budget utilization
- **Overspending Alerts**: Color-coded warnings when approaching or exceeding budgets
- **Budget Analytics**: Compare actual vs budgeted spending

### 🎨 **Customization & Themes**
- **Dark/Light/System Themes**: Automatic theme switching based on system preferences
- **Accent Color Customization**: Choose from 5 accent color themes
- **Dashboard Widgets**: Customize which widgets appear on your home screen
- **Responsive Design**: Optimized for mobile phones, tablets, and desktop computers

### 📱 **Progressive Web App**
- **Offline Functionality**: Works without internet connection
- **Add to Home Screen**: Install as a native-like app on any device
- **Full-Screen Experience**: Immersive app interface when installed
- **Push Notifications**: Get notified about recurring transactions (when enabled)

### 🔒 **Privacy & Data**
- **Local Storage**: All data stored securely on your device
- **No Cloud Dependencies**: Complete privacy with local-only data storage
- **Data Export/Import**: Backup and restore your data as JSON files
- **Google Drive Backup**: Optional cloud backup integration (coming soon)

### 🔧 **Advanced Features**
- **Multi-View Navigation**: Switch between Transactions, Charts, Budgets, and Settings
- **Smart Filtering**: Filter by account, transaction type, date range, and custom criteria
- **Flexible Sorting**: Sort transactions by date, amount, or other criteria
- **Photo Attachments**: Attach receipt photos to transactions
- **Tag System**: Organize transactions with custom tags
- **Data Reset**: Secure data clearing with confirmation

## 🚀 Getting Started

### Web Access
1. Visit the application URL in any modern web browser
2. The app will load instantly and work offline after the first visit

### Mobile Installation (iOS)
1. Open the app in Safari
2. Tap the Share button (📤)
3. Select "Add to Home Screen"
4. Tap "Add" to install

### Mobile Installation (Android)
1. Open the app in Chrome
2. Tap the menu (⋮) and select "Add to Home Screen"
3. Confirm the installation

### Desktop Installation
1. Open the app in Chrome, Edge, or another compatible browser
2. Look for the "Install" button in the address bar
3. Click to install as a desktop app

## 📖 Usage Guide

### Managing Accounts
- **Add Account**: Click the "+" card in the accounts section
- **Customize**: Choose unique icons and colors for easy identification
- **Edit**: Click the edit button on any account card
- **Delete**: Remove accounts (with confirmation to protect data)

### Recording Transactions
1. Click "Add Transaction" button
2. Enter amount, select account and type (income/expense)
3. Choose a category and add description
4. Optionally add notes, set as recurring, or pin to top
5. Attach photos if needed (receipts, etc.)
6. Save to record the transaction

### Analyzing Finances
- **Charts View**: Switch to charts tab for visual analytics
- **Filter Data**: Use time range and account filters
- **Budget Tracking**: Monitor spending against set budgets
- **Search History**: Use the search bar to find specific transactions

### Customization
- **Settings**: Access comprehensive customization options
- **Themes**: Switch between light, dark, and system themes
- **Colors**: Choose accent colors that match your preference
- **Widgets**: Toggle dashboard widgets on/off

## 🛠️ Technical Details

### Built With
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Charts**: Chart.js for interactive visualizations
- **Maps**: Leaflet.js with OpenStreetMap for location features
- **Icons**: Font Awesome for comprehensive iconography
- **Storage**: Browser localStorage API for data persistence
- **PWA**: Service Worker for offline functionality

### Browser Compatibility
- **Recommended**: Chrome 80+, Safari 13+, Firefox 75+, Edge 80+
- **Mobile**: iOS Safari 13+, Android Chrome 80+
- **Features**: Modern browsers with ES6, localStorage, and Geolocation support

### Performance
- **Load Time**: <2 seconds on modern devices
- **Storage**: Efficient local storage with minimal footprint
- **Offline**: Full functionality without internet connection
- **Responsive**: Optimized for all screen sizes

## 💾 Data Management

### Storage
- **Location**: All data stored locally in browser localStorage
- **Security**: No data transmitted to external servers
- **Capacity**: Supports thousands of transactions with fast performance
- **Backup**: Manual export/import with JSON format

### Privacy
- **Data Collection**: Zero data collection or tracking
- **Permissions**: Location access only when adding transactions (optional)
- **Third-party**: No third-party analytics or advertising
- **Transparency**: Open source code available for review

### Backup Options
1. **Local Export**: Download data as JSON file
2. **Local Import**: Restore from previously exported files
3. **Google Drive**: Optional cloud backup (feature in development)

## 🔄 Recurring Transactions

### Setting Up Recurring Transactions
1. When adding a transaction, check "Recurring Transaction"
2. Set frequency (daily, weekly, monthly, yearly)
3. Enable automatic creation in settings
4. Manage all recurring transactions in the settings panel

### Recurring Features
- **Flexible Scheduling**: Multiple frequency options
- **Automatic Creation**: Auto-generate transactions on schedule
- **Easy Management**: Enable/disable or edit recurring transactions
- **Notifications**: Optional alerts for upcoming transactions

## 📊 Budget Features

### Creating Budgets
1. Navigate to Budgets view
2. Click "Set Budget" for any category
3. Enter monthly budget amount
4. Monitor progress throughout the month

### Budget Tracking
- **Visual Progress**: Color-coded progress bars
- **Real-time Updates**: Automatic calculation as you spend
- **Overspending Alerts**: Visual warnings when exceeding budgets
- **Monthly Reset**: Budgets automatically reset each month

## 🎯 Upcoming Features

- **Bill Reminders**: Never miss a payment deadline
- **Investment Tracking**: Monitor investment portfolio performance  
- **Goal Setting**: Set and track financial goals
- **Advanced Reports**: Detailed financial reports and insights
- **Cloud Sync**: Synchronize data across multiple devices
- **Expense Splitting**: Share costs with others
- **Receipt OCR**: Automatic receipt data extraction

## 🤝 Contributing

Money Manager is open source and welcomes contributions! Here's how you can help:

### Ways to Contribute
- **Bug Reports**: Report issues or unexpected behavior
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit pull requests with enhancements
- **Documentation**: Improve documentation and tutorials
- **Testing**: Test the app on different devices and browsers

### Development Setup
1. Fork the repository
2. Clone your fork locally
3. Open `index.html` in a modern browser
4. Make changes and test thoroughly
5. Submit a pull request with detailed description

## 📝 License

This project is available for personal use. Feel free to fork, modify, and use for your own financial tracking needs.

## 🙏 Credits & Acknowledgments

- **Maps**: Powered by Leaflet and OpenStreetMap contributors
- **Icons**: Font Awesome for the comprehensive icon library
- **Charts**: Chart.js for beautiful, interactive visualizations
- **Inspiration**: Built for users who want simple, powerful financial tracking

## 📞 Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Questions**: Check existing issues or create a new discussion
- **Updates**: Watch the repository for new releases and features

## 📈 Version History

- **v0.4.1**: Current version with full feature set
- **Features Added**: Multi-view navigation, budgets, recurring transactions, themes
- **Performance**: Optimized for mobile devices and PWA installation
- **Stability**: Enhanced error handling and data validation

---

**Money Manager** - Take control of your finances with style and simplicity. 💰✨
