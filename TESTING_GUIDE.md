# WeSplit App Testing Guide

## For Non-Technical Friends

### What is WeSplit?
WeSplit is a mobile app that helps friends split expenses and manage shared finances. It allows you to:
- Create groups with friends
- Add expenses and split them
- Track who owes what
- Send and receive money requests
- Manage your wallet and transactions

### How to Test the App

#### Step 1: Install the App
1. **For Android users:**
   - You'll receive an APK file via email or download link
   - Download the APK file to your phone
   - Enable "Install from unknown sources" in your phone settings
   - Tap the APK file to install

2. **For iOS users:**
   - You'll receive a TestFlight invitation
   - Install TestFlight from the App Store
   - Accept the invitation and install the app

#### Step 2: Create an Account
1. Open the WeSplit app
2. Tap "Get Started"
3. Choose your preferred sign-in method:
   - Email/Password
   - Google Sign-In
   - Apple Sign-In (iOS only)
4. Complete the registration process

#### Step 3: Test the Core Features

##### Creating a Group
1. Tap the "+" button on the main screen
2. Select "Create Group"
3. Enter a group name (e.g., "Weekend Trip")
4. Add members by entering their email addresses
5. Tap "Create Group"

##### Adding an Expense
1. In your group, tap "Add Expense"
2. Enter the expense details:
   - Description (e.g., "Dinner")
   - Amount
   - Category (Food, Transport, etc.)
   - Who paid
3. Select how to split the expense
4. Tap "Add Expense"

##### Testing Payment Features
1. **Send Money:**
   - Tap "Send" on the main screen
   - Select a contact
   - Enter amount
   - Confirm the transaction

2. **Request Money:**
   - Tap "Request" on the main screen
   - Select contacts
   - Enter amount
   - Send the request

#### Step 4: Test Different Scenarios

##### Scenario 1: Group Dinner
1. Create a group called "Dinner Club"
2. Add 3-4 friends to the group
3. Add an expense for dinner ($100)
4. Split it equally among all members
5. Check that the balances update correctly

##### Scenario 2: Uneven Split
1. Add another expense ($50)
2. Split it only among 2 people
3. Verify the balances reflect the correct amounts

##### Scenario 3: Payment Settlement
1. Try the "Settle Up" feature
2. Test sending money to friends
3. Verify that balances reset after settlement

### What to Report Back

Please let us know about:

#### Bugs/Issues
- Any crashes or freezes
- Features that don't work as expected
- Error messages you see
- Steps to reproduce problems

#### User Experience
- Is the app easy to navigate?
- Are the buttons and text clear?
- Is the design appealing?
- Are there any confusing parts?

#### Feature Requests
- What features would you like to see?
- What would make the app more useful?
- Any suggestions for improvement?

#### Performance
- Does the app load quickly?
- Are there any delays when using features?
- Does the app work well on your device?

### Contact Information
If you find any issues or have feedback, please:
1. Take a screenshot of the problem
2. Note what you were doing when it happened
3. Send the details to the developer

### Testing Timeline
- **Week 1:** Focus on basic features (groups, expenses, balances)
- **Week 2:** Test advanced features (payments, settlements)
- **Week 3:** Test edge cases and report bugs

Thank you for helping test WeSplit! Your feedback is invaluable for making the app better. 