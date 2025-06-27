# IdeaBase.ai Frontend

IdeaBase.ai frontend is a Next.js-based React application for displaying GitHub Trending projects and their commercial analysis results, helping entrepreneurs find startup ideas.

## Features

- Browse GitHub Trending popular projects
- View commercial value and entrepreneurial opportunity analysis of projects
- Filter projects by programming language
- Responsive design, supports mobile and desktop

## Tech Stack

- **Framework**: Next.js 14 + React 18
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Data Fetching**: SWR + Axios
- **Type System**: TypeScript

## Installation and Setup

### Prerequisites

- Node.js 16+
- npm or yarn

### Environment Setup

1. Install dependencies

```bash
npm install
# or
yarn install
```

2. Create `.env.local` file

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Run in Development Mode

```bash
npm run dev
# or
yarn dev
```

Then visit http://localhost:3000 in your browser

### Build Production Version

```bash
npm run build
# or
yarn build
```

### Run Production Version

```bash
npm run start
# or
yarn start
```

## Development

### Adding New Pages

Create new `.tsx` files in the `src/pages` directory, Next.js will automatically generate routes based on file names.

### Adding New Components

Create new `.tsx` files in the `src/components` directory, follow component naming conventions (PascalCase).

### Style Guide

- Use Tailwind CSS classes for styling
- Use `@layer components` to create utility classes for common components
- Maintain responsive design, support mobile and desktop

## Deployment

### Vercel (Recommended)

Connect your GitHub repository directly to Vercel, it will automatically detect the Next.js project and deploy it.

### Self-hosting

After building the production version, you can deploy the `.next` directory to any server that supports Node.js.

```bash
npm run build
npm run start
```

Or use Docker for deployment, see `docker/frontend/Dockerfile` for details.
