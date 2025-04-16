# AI-Powered Personal Finance App

An AI-powered personal finance web application that provides comprehensive financial management and insights with a focus on user-friendly, engaging financial tracking.

## Features

- **Budget Tracking**: Set and monitor budgets for different expense categories
- **Transaction Management**: Record and categorize your transactions
- **AI-Powered Insights**: Get personalized financial advice and predictions
- **Receipt Scanning**: Extract information from receipts using AI
- **Expense Analytics**: Visualize your spending patterns
- **Bill Reminders**: Keep track of upcoming bills and payments
- **Financial Goals**: Set and track progress toward your financial goals
- **Budget Alerts**: Receive alerts when you approach or exceed your budget

## Technology Stack

- **Frontend**: React.js with TypeScript
- **State Management**: React Query and Context API
- **UI Components**: Shadcn/UI + Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: Passport.js with local strategy
- **AI Integration**: OpenAI API
- **Email Notifications**: SendGrid API
- **Real-time Updates**: WebSockets

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- OpenAI API key (for AI features)
- SendGrid API key (for email alerts)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Required
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=random_secure_string_for_session_encryption

# For AI features
OPENAI_API_KEY=your_openai_api_key

# For email alerts
SENDGRID_API_KEY=your_sendgrid_api_key
```

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd personal-finance-app
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## MongoDB Setup

The application uses MongoDB for data storage. You can:

1. Install MongoDB locally: Follow the [official MongoDB installation guide](https://docs.mongodb.com/manual/installation/)
2. Use MongoDB Atlas: Set up a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)

Set your MongoDB connection string in the `.env` file as shown above.

## Project Structure

- `/client`: Frontend React application
  - `/src/components`: UI components
  - `/src/hooks`: Custom React hooks
  - `/src/pages`: Application pages
  - `/src/lib`: Utility functions

- `/server`: Backend Express application
  - `mongodb.ts`: MongoDB connection setup
  - `models.ts`: Mongoose schemas and models
  - `mongo-storage.ts`: Data access layer
  - `mongo-auth.ts`: Authentication setup
  - `mongo-routes.ts`: API routes
  - `openai.ts`: OpenAI API integration
  - `email.ts`: Email service integration

## API Endpoints

The application provides the following API endpoints:

- **Authentication**
  - `POST /api/register`: Register a new user
  - `POST /api/login`: Log in an existing user
  - `POST /api/logout`: Log out the current user
  - `GET /api/user`: Get the current user

- **Categories**
  - `GET /api/categories`: Get all categories
  - `POST /api/categories`: Create a new category
  - `GET /api/categories/:id`: Get a category by ID
  - `PATCH /api/categories/:id`: Update a category
  - `DELETE /api/categories/:id`: Delete a category

- **Transactions**
  - `GET /api/transactions`: Get all transactions
  - `POST /api/transactions`: Create a new transaction
  - `GET /api/transactions/:id`: Get a transaction by ID
  - `PATCH /api/transactions/:id`: Update a transaction
  - `DELETE /api/transactions/:id`: Delete a transaction
  - `GET /api/transactions/by-date`: Get transactions by date range

- **Budgets**
  - `GET /api/budgets`: Get all budgets
  - `POST /api/budgets`: Create a new budget
  - `GET /api/budgets/:id`: Get a budget by ID
  - `PATCH /api/budgets/:id`: Update a budget
  - `DELETE /api/budgets/:id`: Delete a budget
  - `GET /api/budgets/spending`: Get spending data for budgets
  - `GET /api/budgets/alerts`: Get budget alerts

- **Bills**
  - `GET /api/bills`: Get all bills
  - `POST /api/bills`: Create a new bill
  - `GET /api/bills/:id`: Get a bill by ID
  - `PATCH /api/bills/:id`: Update a bill
  - `DELETE /api/bills/:id`: Delete a bill
  - `GET /api/bills/upcoming`: Get upcoming bills

- **Financial Goals**
  - `GET /api/goals`: Get all financial goals
  - `POST /api/goals`: Create a new goal
  - `GET /api/goals/:id`: Get a goal by ID
  - `PATCH /api/goals/:id`: Update a goal
  - `DELETE /api/goals/:id`: Delete a goal

- **AI Insights**
  - `GET /api/insights`: Get AI insights
  - `GET /api/insights/unread`: Get unread insights
  - `POST /api/insights/mark-read/:id`: Mark an insight as read
  - `POST /api/ai/analyze-receipt`: Analyze a receipt image
  - `POST /api/ai/financial-advice`: Get personalized financial advice
  - `POST /api/ai/predict-expenses`: Predict future expenses
  - `POST /api/ai/saving-suggestions`: Get saving suggestions
  - `POST /api/ai/categorize-transaction`: Categorize a transaction

- **Analytics**
  - `GET /api/analytics/monthly-summary`: Get monthly financial summary
  - `GET /api/analytics/yearly-summary`: Get yearly financial summary

## License

MIT