# PollPulse

> A public voting/polling app where users can vote on questions, follow other users, and get AI-powered question suggestions.

## Features

- **Feed Layout:** Display questions in an Instagram-like scrollable feed.
- **Voting:** Enable users to vote 'Yes' or 'No' on questions.
- **Real-time Results:** Show the percentage split of 'Yes' vs 'No' votes in real-time after voting.
- **Follow System:** Allow users to follow other users.
- **AI Question Suggestion:** Suggest relevant questions based on user's interests, using the user's activity to improve the tool.
- **User Profiles:** A page for users to view a limited number of profile details (name, profile pic).

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/)
- **Database:** [Supabase](https://supabase.io/)
- **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **AI:** [Google AI (Gemini)](https://ai.google.dev/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/PollingPulse.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd PollingPulse/studio
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```
4.  Create a `.env.local` file in the `studio` directory and add the following environment variables:
    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    # Secret used to mint per-user JWTs for RLS (server only)
    SUPABASE_JWT_SECRET=your_supabase_jwt_secret

    NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
    ```


6.  Run the development server:
    ```bash
    npm run dev
    ```
7.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request