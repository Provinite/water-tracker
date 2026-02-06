# Water Tracker

A simple React app to track daily water intake with localStorage persistence.

## Features

- Track water intake throughout the day
- Quick add buttons (250ml, 500ml, 750ml, 1000ml)
- Customizable daily goal
- Progress bar showing percentage of goal achieved
- Daily log with timestamps
- Data persists in localStorage
- Automatically resets each day

## Development

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn build
```

## GitHub Pages Deployment

The app is configured to build to the `docs/` directory for easy GitHub Pages deployment:

1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Set source to "Deploy from a branch"
4. Select branch: `main` and folder: `/docs`
5. Save and wait for deployment

The app will be available at `https://yourusername.github.io/water-tracker/`

## Tech Stack

- React
- Vite
- localStorage for data persistence
