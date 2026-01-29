# GEMINI.md - Aldi Meal Planner 2.0

## Project Overview

This is a full-stack web application designed to help neurodivergent users with meal planning. The primary goal is to reduce decision paralysis by automating the meal selection process. The application is built with a modern tech stack, featuring a React frontend, a Node.js backend, and a Supabase database. The core of the application is an AI-powered meal planning agent that uses Google's Gemini 1.5 Pro model to select recipes based on user preferences and historical data.

### Key Features

*   **AI-Powered Meal Planning:** The application uses a sophisticated AI agent to automatically generate meal plans, taking into account user preferences, dietary restrictions, and past meal history.
*   **Fallback Mechanism:** To ensure a consistent user experience, the application includes a fallback mechanism that generates a meal plan using a traditional algorithm if the AI agent fails or times out.
*   **Cost Calculation:** The application calculates the total cost of the generated meal plan, helping users to stay within their budget.
*   **Grocery List Generation:** The application automatically generates a comprehensive grocery list based on the selected meal plan.
*   **User Authentication:** The application uses Supabase for user authentication, ensuring that user data is secure.

### Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS, Framer Motion
*   **Backend:** Node.js, Express.js
*   **Database:** Supabase (PostgreSQL)
*   **AI:** Google Gemini 1.5 Pro
*   **Testing:** Jest

## Building and Running

### Prerequisites

*   Node.js and npm
*   A Supabase project
*   A Google Gemini API key

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  Create a `.env` file in the root directory of the project.
2.  Add the following environment variables to the `.env` file:
    ```
    SUPABASE_URL=<your-supabase-url>
    SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
    GEMINI_API_KEY=<your-gemini-api-key>
    ```

### Running the Application

1.  Start the backend server:
    ```bash
    npm run dev:server
    ```
2.  Start the frontend development server:
    ```bash
    npm run dev
    ```
3.  Open your browser and navigate to `http://localhost:5173`.

### Testing

Run the tests using the following command:
```bash
npm test
```

## Development Conventions

### Coding Style

The project uses ESLint to enforce a consistent coding style. Before committing any changes, please run the following command to check for any linting errors:
```bash
npm run lint
```

### Testing

All new features and bug fixes should be accompanied by corresponding tests. The project uses Jest for testing.

### Commit Messages

Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
