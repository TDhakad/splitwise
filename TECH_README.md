# HisabKitab: Shared Money And Planning

HisabKitab is a modern, secure, and fully-featured application for tracking shared expenses, settling debts, and planning group spending. Built with privacy and ease of use in mind, it enforces strict data isolation and a secure connection graph.

---

## 🎯 Features

*   **Secure Google Authentication:** Seamless login using Google Identity Services. No password management required.
*   **True Data Isolation:** Fully multi-tenant architecture. You only see expenses, groups, and balances that you are explicitly a part of.
*   **Connection Graph (Friend Requests):** A strict, privacy-first social graph. You must invite friends via their exact email address to send a connection request. Partial name searching is disabled to prevent data scraping.
*   **Group Management:** Organize shared expenses by trips, apartments, or events.
*   **Advanced Expense Splitting:** Support for equally dividing expenses, exact amounts, or custom percentages.
*   **Debt Simplification:** Intelligently calculates the minimum number of transactions required to settle up complex group debts.
*   **Audit Logging:** Complete transparency. Every change to an expense is tracked so you always know who modified what.
*   **Receipt Scanning:** Endpoint support for uploading and attaching receipt images to expenses.

## 💻 Tech Stack

**Backend**
*   **Python & FastAPI:** High-performance, async-ready Python web framework.
*   **SQLAlchemy:** Robust ORM for database interactions.
*   **PostgreSQL (Supabase):** Reliable, scalable relational database hosting.
*   **OAuth 2.0:** Secure stateless token verification.

**Frontend**
*   **React & Vite:** Lightning-fast modern frontend development.
*   **Tailwind CSS:** Highly customized, aesthetic, and responsive UI components.
*   **@react-oauth/google:** Official Google Auth integration for React.

## 🚀 Getting Started

### Prerequisites
*   Python 3.11+
*   Node.js 18+
*   A Google Cloud Console account (for OAuth Client ID)
*   A PostgreSQL Database (e.g., Supabase)

### Backend Setup
1. Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@your-database-host:5432/postgres
   DB_PASSWORD=your-secure-password
   ```
2. Install dependencies using `uv` (or pip):
   ```bash
   uv pip install -r requirements.txt
   uv pip install psycopg2-binary python-dotenv
   ```
3. Start the FastAPI server:
   ```bash
   uv run uvicorn backend.main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Update your `constants.js` with your Google Client ID.
3. Install Node modules:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 🔮 Future Scope

While the core functionality is robust and production-ready, the roadmap for this application includes:
*   **Real-time Synchronization:** Implementing WebSockets to instantly update balances and notify users when a friend adds a new expense.
*   **Automated Reminders:** Scheduled background tasks (via Celery or similar) to send gentle email/push reminders for long-overdue settlements.
*   **Advanced OCR Receipt Parsing:** Deep integration with Vision APIs to automatically itemize receipts and assign specific line items to specific friends.
*   **Mobile Application:** Porting the responsive web UI into a native iOS and Android application using React Native.
*   **Multi-Currency Support:** Live exchange rate integration to automatically convert and settle debts incurred during international travel.
