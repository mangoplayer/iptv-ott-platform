'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/app/store/auth-store';
import { usePreferencesStore } from '@/app/store/preferences-store';
import { useState } from 'react';
import { 
  Home, 
  Tv, 
  Film, 
  Layers, 
  Search, 
  User, 
  Settings, 
  LogOut, 
  Moon, 
  Sun, 
  Monitor,
  Menu,
  X
} from 'lucide-react';

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, setTheme } = usePreferencesStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const routes = [
    {
      href: '/',
      label: 'Home',
      icon: <Home className="h-4 w-4 mr-2" />,
      active: pathname === '/',
    },
    {
      href: '/live-tv',
      label: 'Live TV',
      icon: <Tv className="h-4 w-4 mr-2" />,
      active: pathname === '/live-tv',
    },
    {
      href: '/movies',
      label: 'Movies',
      icon: <Film className="h-4 w-4 mr-2" />,
      active: pathname.startsWith('/movies'),
    },
    {
      href: '/series',
      label: 'Series',
      icon: <Layers className="h-4 w-4 mr-2" />,
      active: pathname.startsWith('/series'),
    },
  ];
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchQuery.trim()) {
      // Update URL with search query
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      router.push(`/search?${params.toString()}`);
      setSearchQuery('');
    } else {
      router.push('/search');
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/');
    setMobileMenuOpen(false);
  };
  
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl flex items-center mr-4">
          <span className="hidden sm:inline">IPTV Platform</span>
          <span className="sm:hidden">IPTV</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 mx-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary flex items-center',
                route.active
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {route.icon}
              {route.label}
            </Link>
          ))}
        </nav>
        
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        
        {/* Search and User Actions */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Search Form */}
          {isAuthenticated && (
            <form onSubmit={handleSearch} className="hidden md:flex relative">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] lg:w-[300px]"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          )}
          
          {/* User Menu */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/images/avatar.png" alt={user.username} />
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Expires: {new Date(user.expiryDate || '').toLocaleDateString()}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/search" className="flex items-center md:hidden">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-4 w-4 mr-2" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 mr-2" />
                      Dark Mode
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('system')}
                  className="flex items-center"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  System Theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/auth/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="flex flex-col p-4 space-y-4">
            {/* Mobile Search */}
            {isAuthenticated && (
              <form onSubmit={handleSearch} className="relative mb-2">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            )}
            
            {/* Mobile Navigation */}
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  'flex items-center py-2 px-3 rounded-md transition-colors',
                  route.active
                    ? 'bg-muted text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {route.icon}
                {route.label}
              </Link>
            ))}
            
            {/* Additional Mobile Links */}
            {isAuthenticated && (
              <>
                <Link
                  href="/profile"
                  className="flex items-center py-2 px-3 rounded-md transition-colors text-muted-foreground hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center py-2 px-3 rounded-md transition-colors text-muted-foreground hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                <Button
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}