# Modern IPTV/OTT Platform

A Netflix-style IPTV/OTT (Over-The-Top) streaming platform built with Next.js, TypeScript, and Tailwind CSS. This application provides a modern, responsive interface for streaming live TV channels, movies, and TV series from Xtream Codes IPTV providers.

![IPTV/OTT Platform](https://github.com/mangoplayer/iptv-ott-platform/assets/209875192/placeholder-image)

## Features

- **Modern UI**: Netflix-inspired interface with smooth animations and transitions
- **Responsive Design**: Works on mobile, tablet, and desktop devices
- **Live TV**: Stream live TV channels with EPG (Electronic Program Guide) support
- **Movies & Series**: Browse and stream VOD content with detailed information
- **TMDB Integration**: Rich metadata for movies and TV shows
- **User Preferences**: Theme switching, language selection, and playback settings
- **Watch History**: Track watched content and continue where you left off
- **Favorites**: Save your favorite channels, movies, and series
- **Search**: Find content across all categories
- **Parental Controls**: Restrict access to adult content

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Video Playback**: HLS.js
- **API Integration**: Xtream Codes API, TMDB API

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- An Xtream Codes IPTV subscription
- TMDB API key (optional, for enhanced metadata)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/mangoplayer/iptv-ott-platform.git
cd iptv-ott-platform
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. On the login screen, enter your Xtream Codes server URL, username, and password
2. Browse content through the navigation menu (Live TV, Movies, Series)
3. Use the search function to find specific content
4. Customize your experience in the Settings page

## Project Structure

```
/app
  /auth          # Authentication pages
  /components    # Reusable UI components
  /live-tv       # Live TV pages
  /movies        # Movie pages
  /series        # TV series pages
  /profile       # User profile pages
  /search        # Search functionality
  /settings      # User settings
  /services      # API services
  /store         # Zustand stores
  /types         # TypeScript type definitions
/components/ui   # shadcn UI components
/public          # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [TMDB](https://www.themoviedb.org/) for movie and TV show metadata
