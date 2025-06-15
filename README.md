# StudyPal

A modern web application for connecting students and facilitating collaborative learning.

## Features

- User authentication with Supabase
- Modern UI with Tailwind CSS
- Responsive design
- Protected routes
- User dashboard

## Tech Stack

- React with TypeScript
- Vite
- Tailwind CSS
- Supabase (Authentication & Database)
- React Router
- Headless UI

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
  ├── components/     # Reusable components
  ├── pages/         # Page components
  ├── lib/           # Utility functions and configurations
  ├── App.tsx        # Main application component
  └── main.tsx       # Application entry point
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 